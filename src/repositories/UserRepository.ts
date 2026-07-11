import { collection, doc, getDocs, query, setDoc, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { User } from '../models/User';

export class UserRepository {
  private usersCollection = collection(db, 'users');

  /**
   * Search for a user by their username (case-insensitive query simulation).
   * Since usernames are unique and stored in lower case, we compare normalized strings.
   */
  public async getUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const normalized = username.trim().toLowerCase();
    
    const q = query(this.usersCollection, where('username', '==', normalized));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docData = querySnapshot.docs[0].data();
    return {
      username: docData.username,
      displayName: docData.username.charAt(0).toUpperCase() + docData.username.slice(1),
      role: 'TEMPORARY_CONTACT',
      uid: docData.uid // we can expose uid as well
    } as any;
  }

  /**
   * Fetch user details by their UID.
   */
  public async getUserByUid(uid: string): Promise<User | null> {
    if (!uid) return null;
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        username: data.username,
        displayName: data.username.charAt(0).toUpperCase() + data.username.slice(1),
        role: 'OPERATOR',
        uid: data.uid
      } as any;
    }
    return null;
  }

  /**
   * Create / register a unique username for a given UID.
   * Returns true if successful, false if already exists.
   */
  public async registerUsername(uid: string, username: string): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    
    // 1. Check if username is already taken by anyone (including self, though we check overall first)
    const existingUser = await this.getUserByUsername(normalized);
    if (existingUser) {
      return false; // Already taken
    }
    
    // 2. Set the user document under their UID
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      username: normalized,
      createdAt: Date.now()
    });
    
    return true;
  }
}
