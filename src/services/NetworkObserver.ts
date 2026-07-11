export type NetworkCallback = (isOnline: boolean) => void;

export class NetworkObserver {
  private static instance: NetworkObserver | null = null;
  private listeners: Set<NetworkCallback> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  public static getInstance(): NetworkObserver {
    if (!NetworkObserver.instance) {
      NetworkObserver.instance = new NetworkObserver();
    }
    return NetworkObserver.instance;
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notify();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notify();
  };

  public getStatus(): boolean {
    return this.isOnline;
  }

  public subscribe(callback: NetworkCallback): () => void {
    this.listeners.add(callback);
    callback(this.isOnline); // immediate initial value callback

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.isOnline);
      } catch (err) {
        console.error('Error calling network status listener:', err);
      }
    });
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
    NetworkObserver.instance = null;
  }
}
