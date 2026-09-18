export class FullscreenManager {
  private static instance: FullscreenManager | null = null;
  private isFullscreenActive: boolean = false;
  private inSecretSession: boolean = false;
  public disableAutoFullscreen: boolean = true;

  public static getInstance(): FullscreenManager {
    if (!FullscreenManager.instance) {
      FullscreenManager.instance = new FullscreenManager();
    }
    return FullscreenManager.instance;
  }

  private constructor() {
    // Auto-fullscreen listeners disabled
  }

  /**
   * Set flag whether we are in a secret session screen
   */
  public setSecretSessionActive(active: boolean) {
    this.inSecretSession = active;
  }

  /**
   * Request Immersive Fullscreen Mode (Only if triggered manually)
   */
  public enterFullscreen(isManual = false) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    // Auto-fullscreen completely disabled
    if (!isManual) {
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
}
