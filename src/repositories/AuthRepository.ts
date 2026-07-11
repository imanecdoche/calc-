import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/FirebaseModule';

export class AuthRepository {
  public async loginAnonymously(): Promise<FirebaseUser> {
    const credential = await signInAnonymously(auth);
    return credential.user;
  }

  public getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  public listenToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}
