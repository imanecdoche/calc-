export class SecureWindowManager {
  private static instance: SecureWindowManager | null = null;
  private isActive: boolean = false;

  public static getInstance(): SecureWindowManager {
    if (!SecureWindowManager.instance) {
      SecureWindowManager.instance = new SecureWindowManager();
    }
    return SecureWindowManager.instance;
  }

  /**
   * Enable FLAG_SECURE web equivalent.
   */
  public enableSecureMode() {
    if (this.isActive) return;
    this.isActive = true;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('contextmenu', this.preventEvent);
      document.addEventListener('copy', this.preventEvent);
      document.addEventListener('cut', this.preventEvent);
      document.addEventListener('dragstart', this.preventEvent);
      window.addEventListener('keydown', this.handleKeydown);

      // Add a CSS style block to prevent user selection and blank out prints
      let styleEl = document.getElementById('secure-window-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'secure-window-styles';
        styleEl.innerHTML = `
          body {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }
          @media print {
            body {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }

  /**
   * Disable FLAG_SECURE web equivalent.
   */
  public disableSecureMode() {
    if (!this.isActive) return;
    this.isActive = false;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.removeEventListener('contextmenu', this.preventEvent);
      document.removeEventListener('copy', this.preventEvent);
      document.removeEventListener('cut', this.preventEvent);
      document.removeEventListener('dragstart', this.preventEvent);
      window.removeEventListener('keydown', this.handleKeydown);

      const styleEl = document.getElementById('secure-window-styles');
      if (styleEl) {
        styleEl.remove();
      }
    }
  }

  private preventEvent = (e: Event) => {
    e.preventDefault();
  };

  private handleKeydown = (e: KeyboardEvent) => {
    // Detect typical screenshot/save commands
    // Cmd+S / Ctrl+S (Save), PrintScreen, Cmd+Shift+3/4/5
    if (
      e.key === 'PrintScreen' || 
      ((e.metaKey || e.ctrlKey) && e.key === 's') ||
      ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
    ) {
      e.preventDefault();
      
      // Temporarily blank out the screen as protection feedback
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.backgroundColor = '#000000';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.color = '#ff4444';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '12px';
      overlay.innerText = 'FLAG_SECURE: SCREENSHOT LOCKED';
      
      document.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 1000);
    }
  };
}
