import { NetworkObserver } from './NetworkObserver';

export type ConnectionState = 'connected' | 'connecting' | 'offline';
export type ConnectionStateCallback = (state: ConnectionState) => void;

export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private networkObserver = NetworkObserver.getInstance();
  private listeners: Set<ConnectionStateCallback> = new Set();
  private state: ConnectionState = 'connecting';
  private unsubscribeNetwork: (() => void) | null = null;

  private constructor() {
    this.unsubscribeNetwork = this.networkObserver.subscribe((isOnline) => {
      if (!isOnline) {
        this.updateState('offline');
      } else {
        // When going back online, temporarily show 'connecting', then let the app upgrade it to 'connected' once subscription is active.
        this.updateState('connecting');
      }
    });
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public getStatus(): ConnectionState {
    return this.state;
  }

  public setFirestoreConnected(isConnected: boolean) {
    if (!this.networkObserver.getStatus()) {
      this.updateState('offline');
    } else if (isConnected) {
      this.updateState('connected');
    } else {
      this.updateState('connecting');
    }
  }

  public subscribe(callback: ConnectionStateCallback): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private updateState(newState: ConnectionState) {
    if (this.state === newState) return;
    this.state = newState;
    this.listeners.forEach((cb) => {
      try {
        cb(this.state);
      } catch (err) {
        console.error('Error triggering connection state listener:', err);
      }
    });
  }

  public destroy() {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
    this.listeners.clear();
    ConnectionManager.instance = null;
  }
}
