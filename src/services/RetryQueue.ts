import { Message } from '../models/Message';

export type RetryCallback = (message: Message) => Promise<boolean>;

export class RetryQueue {
  private static instance: RetryQueue | null = null;
  private failedMessages: Map<string, Message> = new Map();

  public static getInstance(): RetryQueue {
    if (!RetryQueue.instance) {
      RetryQueue.instance = new RetryQueue();
    }
    return RetryQueue.instance;
  }

  public addFailedMessage(message: Message) {
    this.failedMessages.set(message.id, {
      ...message,
      status: 'failed'
    });
  }

  public removeFailedMessage(id: string) {
    this.failedMessages.delete(id);
  }

  public getFailedMessages(): Message[] {
    return Array.from(this.failedMessages.values());
  }

  public isFailed(id: string): boolean {
    return this.failedMessages.has(id);
  }

  /**
   * Resend a single failed message using the provided sender callback.
   */
  public async retryMessage(id: string, resendFn: RetryCallback): Promise<boolean> {
    const msg = this.failedMessages.get(id);
    if (!msg) return false;

    const success = await resendFn(msg);
    if (success) {
      this.failedMessages.delete(id);
    }
    return success;
  }

  public clear() {
    this.failedMessages.clear();
  }
}
