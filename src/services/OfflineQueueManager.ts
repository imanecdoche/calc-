import { Message } from '../models/Message';
import { NetworkObserver } from './NetworkObserver';

export type FlushCallback = (msg: Message) => Promise<boolean>;

export class OfflineQueueManager {
  private static instance: OfflineQueueManager | null = null;
  private queue: Message[] = [];
  private networkObserver = NetworkObserver.getInstance();
  private isProcessing: boolean = false;

  public static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  /**
   * Add a message to the offline queue if we are disconnected.
   */
  public enqueue(message: Message) {
    this.queue.push({
      ...message,
      status: 'sending'
    });
  }

  public getQueue(): Message[] {
    return this.queue;
  }

  public removeFromQueue(id: string) {
    this.queue = this.queue.filter(m => m.id !== id);
  }

  public clearQueue() {
    this.queue = [];
  }

  /**
   * Monitor network states. When online, trigger automatic background flushing.
   */
  public startAutoFlush(flushFn: FlushCallback) {
    this.networkObserver.subscribe(async (isOnline) => {
      if (isOnline && this.queue.length > 0) {
        await this.flush(flushFn);
      }
    });
  }

  /**
   * Sequential delivery of queued messages in strict chronological order.
   */
  public async flush(flushFn: FlushCallback): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (!this.networkObserver.getStatus()) {
        break; // Stop if offline again
      }

      const msg = this.queue[0];
      try {
        const success = await flushFn(msg);
        if (success) {
          this.queue.shift(); // Remove from queue on success
        } else {
          // If sending fails but we are online, it might be permission/auth related. Keep it or move to retry.
          // Let's break to prevent infinite loops, or shift it to retry queue.
          break;
        }
      } catch (err) {
        console.error('Error flushing offline message:', err);
        break;
      }
    }

    this.isProcessing = false;
  }
}
