export type VisibilityCallback = (isVisible: boolean) => void;

export class RecentTaskProtector {
  private static instance: RecentTaskProtector | null = null;
  private listeners: Set<VisibilityCallback> = new Set();
  private isAppVisible: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('blur', this.handleBlur);
      window.addEventListener('focus', this.handleFocus);
    }
  }

  public static getInstance(): RecentTaskProtector {
    if (!RecentTaskProtector.instance) {
      RecentTaskProtector.instance = new RecentTaskProtector();
    }
    return RecentTaskProtector.instance;
  }

  private handleVisibilityChange = () => {
    this.isAppVisible = document.visibilityState === 'visible';
    this.notify();
  };

  private handleBlur = () => {
    this.isAppVisible = false;
    this.notify();
  };

  private handleFocus = () => {
    this.isAppVisible = true;
    this.notify();
  };

  public isVisible(): boolean {
    return this.isAppVisible;
  }

  public subscribe(callback: VisibilityCallback): () => void {
    this.listeners.add(callback);
    callback(this.isAppVisible);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.isAppVisible);
      } catch (err) {
        console.error('Error notifying visibility listener:', err);
      }
    });
  }

  public destroy() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('blur', this.handleBlur);
      window.removeEventListener('focus', this.handleFocus);
    }
    this.listeners.clear();
    RecentTaskProtector.instance = null;
  }
}
