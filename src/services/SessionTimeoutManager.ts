export class SessionTimeoutManager {
  private static instance: SessionTimeoutManager | null = null;
  private timeoutDuration: number = 15 * 60 * 1000; // 15 minutes in milliseconds
  private timer: any = null;
  private onTimeoutCallback: (() => void) | null = null;

  private constructor() {
    this.resetTimer = this.resetTimer.bind(this);
  }

  public static getInstance(): SessionTimeoutManager {
    if (!SessionTimeoutManager.instance) {
      SessionTimeoutManager.instance = new SessionTimeoutManager();
    }
    return SessionTimeoutManager.instance;
  }

  /**
   * Start tracking user activity.
   */
  public startTracking(onTimeout: () => void) {
    this.onTimeoutCallback = onTimeout;
    this.resetTimer();

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.resetTimer);
      window.addEventListener('mousedown', this.resetTimer);
      window.addEventListener('keydown', this.resetTimer);
      window.addEventListener('scroll', this.resetTimer);
      window.addEventListener('touchstart', this.resetTimer);
    }
  }

  /**
   * Stop tracking user activity.
   */
  public stopTracking() {
    this.clearTimer();
    this.onTimeoutCallback = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.resetTimer);
      window.removeEventListener('mousedown', this.resetTimer);
      window.removeEventListener('keydown', this.resetTimer);
      window.removeEventListener('scroll', this.resetTimer);
      window.removeEventListener('touchstart', this.resetTimer);
    }
  }

  private resetTimer() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.triggerTimeout();
    }, this.timeoutDuration);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private triggerTimeout() {
    console.warn('Session timeout reached due to 15 minutes of inactivity. Logging out...');
    if (this.onTimeoutCallback) {
      try {
        this.onTimeoutCallback();
      } catch (err) {
        console.error('Error during session timeout callback execution:', err);
      }
    }
    this.stopTracking();
  }
}
