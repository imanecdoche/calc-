import { SessionManager } from '../models/SessionManager';

export class SessionCleaner {
  private static instance: SessionCleaner | null = null;
  private activeUnsubscribes: Set<() => void> = new Set();

  public static getInstance(): SessionCleaner {
    if (!SessionCleaner.instance) {
      SessionCleaner.instance = new SessionCleaner();
    }
    return SessionCleaner.instance;
  }

  /**
   * Register active firestore realtime listeners
   */
  public registerListener(unsub: () => void): void {
    this.activeUnsubscribes.add(unsub);
  }

  /**
   * Unsubscribe from all registered listeners
   */
  public disconnectAllListeners(): void {
    this.activeUnsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.error('Error disconnecting listener:', e);
      }
    });
    this.activeUnsubscribes.clear();
  }

  /**
   * Perform entire session wipe
   */
  public wipeSession(): void {
    // 1. Disconnect all listeners
    this.disconnectAllListeners();

    // 2. Clear SessionManager
    SessionManager.getInstance().clearSession();
  }
}
