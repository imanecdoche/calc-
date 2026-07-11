import { User } from './User';

export class SessionManager {
  private static instance: SessionManager | null = null;
  private currentUser: User | null = null;
  private activeTargetUser: User | null = null;

  private constructor() {
    // Default current user (the app owner / operator)
    this.currentUser = {
      username: 'operator',
      displayName: 'Operator Alpha',
      role: 'Host'
    };
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getActiveTargetUser(): User | null {
    return this.activeTargetUser;
  }

  public setActiveTargetUser(user: User | null): void {
    this.activeTargetUser = user;
  }

  public clearSession(): void {
    this.activeTargetUser = null;
  }
}
