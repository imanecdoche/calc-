import { collection, doc, getDocs, query, setDoc, where, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { User } from '../models/User';

export class UserRepository {
  private usersCollection = collection(db, 'users');

  /**
   * Fetch all registered users for Developer Tools.
   */
  public async getAllUsers(): Promise<any[]> {
    const querySnapshot = await getDocs(this.usersCollection);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        username: data.username,
        password: data.password || '',
        createdAt: data.createdAt || 0,
      });
    });
    return list;
  }

  /**
   * Delete a user by UID/document ID.
   */
  public async deleteUser(uid: string): Promise<void> {
    if (!uid) return;
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  }

  /**
   * Update a user's details from DevTools.
   */
  public async updateUser(uid: string, username: string, passwordVal: string): Promise<boolean> {
    if (!uid) return false;
    const normalized = username.trim().toLowerCase();
    
    // Check if the username is taken by someone else
    const existingUser = await this.getUserByUsername(normalized);
    if (existingUser && (existingUser as any).uid !== uid) {
      return false; // username is taken by someone else
    }

    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      username: normalized,
      password: passwordVal
    }, { merge: true });
    return true;
  }

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
      uid: docData.uid,
      password: docData.password || ''
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
        uid: data.uid,
        password: data.password || ''
      } as any;
    }
    return null;
  }

  /**
   * Create / register a unique username for a given UID.
   * Returns true if successful, false if already exists.
   */
  public async registerUsername(uid: string, username: string, passwordVal: string): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    
    // 1. Check if username is already taken by anyone
    const existingUser = await this.getUserByUsername(normalized);
    if (existingUser) {
      return false; // Already taken
    }
    
    // 2. Set the user document under their UID with password
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      username: normalized,
      password: passwordVal,
      createdAt: Date.now()
    });
    
    return true;
  }

  /**
   * Update password for an existing logged-in user.
   */
  public async updateUserPassword(uid: string, passwordVal: string): Promise<boolean> {
    if (!uid) return false;
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      password: passwordVal
    }, { merge: true });
    return true;
  }

  /**
   * Login to an existing account on a new device.
   * Maps the username and password to the new device's UID.
   */
  public async loginToExistingAccount(newUid: string, username: string, passwordVal: string): Promise<{ success: boolean; error?: string }> {
    const normalized = username.trim().toLowerCase();
    
    // 1. Fetch the existing user profile
    const existingUser = await this.getUserByUsername(normalized);
    if (!existingUser) {
      return { success: false, error: 'Username tidak ditemukan.' };
    }

    const correctPassword = (existingUser as any).password;
    if (!correctPassword) {
      return { success: false, error: 'Akun ini belum memiliki password. Silakan atur password di perangkat asal terlebih dahulu.' };
    }

    if (correctPassword !== passwordVal) {
      return { success: false, error: 'Password salah.' };
    }

    // 2. Link this username to the current device's UID by writing a new profile document under newUid
    const userDocRef = doc(db, 'users', newUid);
    await setDoc(userDocRef, {
      uid: newUid,
      username: normalized,
      password: passwordVal,
      createdAt: Date.now()
    });

    return { success: true };
  }
}
