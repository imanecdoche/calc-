export class FullscreenManager {
  private static instance: FullscreenManager | null = null;
  private isFullscreenActive: boolean = false;
  private inSecretSession: boolean = false;
  public disableAutoFullscreen: boolean = false;

  public static getInstance(): FullscreenManager {
    if (!FullscreenManager.instance) {
      FullscreenManager.instance = new FullscreenManager();
    }
    return FullscreenManager.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      // Re-apply fullscreen when coming back from background (focus or visibility change)
      window.addEventListener('focus', this.handleResume);
      document.addEventListener('visibilitychange', this.handleResume);
      window.addEventListener('resize', this.handleResize);
    }
  }

  /**
   * Set flag whether we are in a secret session screen
   */
  public setSecretSessionActive(active: boolean) {
    this.inSecretSession = active;
    if (active) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  /**
   * Request Immersive Fullscreen Mode (Web equivalent of Android WindowInsetsControllerCompat)
   */
  public enterFullscreen(isManual = false) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    if (this.disableAutoFullscreen && !isManual) {
      console.log('Auto fullscreen request blocked because user previously exited fullscreen.');
      return;
    }

    const docEl = document.documentElement as any;

    try {
      const requestMethod = 
        docEl.requestFullscreen || 
        docEl.webkitRequestFullscreen || 
        docEl.mozRequestFullScreen || 
        docEl.msRequestFullscreen;

      if (requestMethod) {
        requestMethod.call(docEl).catch((err: any) => {
          console.warn('Fullscreen request rejected or blocked by iframe permissions:', err);
        });
      }
      this.isFullscreenActive = true;
    } catch (e) {
      console.warn('Fullscreen API error:', e);
    }
  }

  /**
   * Exit Fullscreen Mode
   */
  public exitFullscreen() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    try {
      const exitMethod = 
        document.exitFullscreen || 
        (document as any).webkitExitFullscreen || 
        (document as any).mozCancelFullScreen || 
        (document as any).msExitFullscreen;

      const isCurrentFS = document.fullscreenElement || (document as any).webkitFullscreenElement;

      if (isCurrentFS && exitMethod) {
        exitMethod.call(document).catch((err: any) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
      this.isFullscreenActive = false;
    } catch (e) {
      console.warn('Exit fullscreen error:', e);
    }
  }

  public getStatus(): boolean {
    if (typeof document === 'undefined') return false;
    return !!(document.fullscreenElement || (document as any).webkitFullscreenElement || this.isFullscreenActive);
  }

  private handleResume = () => {
    // If app resumes and we are in a secret session, re-enforce immersive fullscreen
    if (this.inSecretSession) {
      this.enterFullscreen();
    }
  };

  private handleResize = () => {
    // Lifecycle check
    if (this.inSecretSession && !this.getStatus()) {
      // Attempt to re-enter if exited unexpectedly during resize/orientation changes
      this.enterFullscreen();
    }
  };
}
