import { collection, doc, getDocs, query, setDoc, where, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { User } from '../models/User';

export class UserRepository {
  private usersCollection = collection(db, 'users');

  /**
   * Fetch all registered users for Developer Tools.
   * Deduplicates by username and automatically purges older duplicate documents in Firestore.
   */
  public async getAllUsers(): Promise<any[]> {
    const querySnapshot = await getDocs(this.usersCollection);
    const usersByUsername = new Map<string, any>();
    const duplicateDocIdsToDelete: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawUsername = data.username || '';
      const username = rawUsername.trim().toLowerCase();
      if (!username) return;

      const record = {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
        username,
        password: data.password || '',
        createdAt: data.createdAt || 0,
      };

      if (usersByUsername.has(username)) {
        const existing = usersByUsername.get(username);
        // Keep the newer one, mark the older one for deletion
        if (record.createdAt >= existing.createdAt) {
          duplicateDocIdsToDelete.push(existing.id);
          usersByUsername.set(username, record);
        } else {
          duplicateDocIdsToDelete.push(record.id);
        }
      } else {
        usersByUsername.set(username, record);
      }
    });

    // Automatically purge old duplicate documents from Firestore in the background
    if (duplicateDocIdsToDelete.length > 0) {
      Promise.all(duplicateDocIdsToDelete.map(id => deleteDoc(doc(db, 'users', id))))
        .catch(err => console.warn('[UserRepository] Auto-purge duplicates error:', err));
    }

    return Array.from(usersByUsername.values());
  }

  /**
   * Delete a user by UID and clean up any duplicate documents matching the username.
   */
  public async deleteUser(uid: string, username?: string): Promise<void> {
    if (!uid) return;
    
    // 1. Delete document by UID
    try {
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);
    } catch (e) {
      console.warn('[UserRepository] Delete by UID failed, checking username:', e);
    }

    // 2. Also delete all docs with this username to ensure 100% cleanup
    if (username) {
      const normalized = username.trim().toLowerCase();
      const q = query(this.usersCollection, where('username', '==', normalized));
      const snap = await getDocs(q);
      const deletions: Promise<void>[] = [];
      snap.forEach(d => {
        deletions.push(deleteDoc(d.ref));
      });
      await Promise.all(deletions);
    }
  }

  /**
   * Update a user's details from DevTools.
   */
  public async updateUser(uid: string, username: string, passwordVal: string): Promise<boolean> {
    if (!uid) return false;
    const normalized = username.trim().toLowerCase();
    
    // Check if the username is taken by someone else
    const existingUser = await this.getUserByUsername(normalized);
    if (existingUser && (existingUser as any).uid !== uid && (existingUser as any).username !== normalized) {
      return false; // username is taken by another distinct account
    }

    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      username: normalized,
      password: passwordVal
    }, { merge: true });
    return true;
  }

  /**
   * Search for a user by their username (case-insensitive).
   * If legacy duplicates exist, returns the latest and purges older duplicates.
   */
  public async getUserByUsername(username: string): Promise<User | null> {
    if (!username) return null;
    const normalized = username.trim().toLowerCase();
    
    const q = query(this.usersCollection, where('username', '==', normalized));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Select the newest doc if duplicates exist
    let latestDoc = querySnapshot.docs[0];
    let latestCreatedAt = (latestDoc.data().createdAt as number) || 0;
    const duplicateIds: string[] = [];

    for (let i = 1; i < querySnapshot.docs.length; i++) {
      const d = querySnapshot.docs[i];
      const cTime = (d.data().createdAt as number) || 0;
      if (cTime > latestCreatedAt) {
        duplicateIds.push(latestDoc.id);
        latestDoc = d;
        latestCreatedAt = cTime;
      } else {
        duplicateIds.push(d.id);
      }
    }

    if (duplicateIds.length > 0) {
      Promise.all(duplicateIds.map(id => deleteDoc(doc(db, 'users', id))))
        .catch(e => console.warn('[UserRepository] Cleaned duplicate docs:', e));
    }

    const docData = latestDoc.data();
    return {
      username: docData.username,
      displayName: docData.username.charAt(0).toUpperCase() + docData.username.slice(1),
      role: 'TEMPORARY_CONTACT',
      uid: docData.uid || latestDoc.id,
      password: docData.password || '',
      createdAt: docData.createdAt || 0
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
        uid: data.uid || docSnap.id,
        password: data.password || ''
      } as any;
    }

    // Fallback search by uid field in case document id differs
    const q = query(this.usersCollection, where('uid', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return {
        username: data.username,
        displayName: data.username.charAt(0).toUpperCase() + data.username.slice(1),
        role: 'OPERATOR',
        uid: data.uid || snap.docs[0].id,
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

    // 2. Clean up any stale docs for this uid or username
    const q = query(this.usersCollection, where('username', '==', normalized));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    
    // 3. Set the single user document under their UID with password
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
   * Re-link an existing account to a new session UID without creating duplicates.
   */
  public async relinkUserUid(newUid: string, username: string): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    const existingUser = await this.getUserByUsername(normalized);
    if (!existingUser) return false;

    // Remove old docs that aren't newUid
    const q = query(this.usersCollection, where('username', '==', normalized));
    const snap = await getDocs(q);
    const deletions: Promise<void>[] = [];
    for (const d of snap.docs) {
      if (d.id !== newUid) {
        deletions.push(deleteDoc(d.ref));
      }
    }
    await Promise.all(deletions);

    // Write the new single document
    const userDocRef = doc(db, 'users', newUid);
    await setDoc(userDocRef, {
      uid: newUid,
      username: normalized,
      password: (existingUser as any).password || '',
      createdAt: (existingUser as any).createdAt || Date.now(),
      lastLoginAt: Date.now()
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
   * Maps the username and password to the new device's UID, and PURGES old duplicate documents.
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
      return { success: false, error: 'Akun ini belum memiliki password.' };
    }

    if (correctPassword !== passwordVal) {
      return { success: false, error: 'Password salah.' };
    }

    // 2. Remove all old documents for this username so there is NEVER a duplicate
    const q = query(this.usersCollection, where('username', '==', normalized));
    const snap = await getDocs(q);
    const deletions: Promise<void>[] = [];
    for (const d of snap.docs) {
      if (d.id !== newUid) {
        deletions.push(deleteDoc(d.ref));
      }
    }
    await Promise.all(deletions);

    // 3. Save the single canonical active user document under newUid
    const userDocRef = doc(db, 'users', newUid);
    await setDoc(userDocRef, {
      uid: newUid,
      username: normalized,
      password: passwordVal,
      createdAt: (existingUser as any).createdAt || Date.now(),
      lastLoginAt: Date.now()
    });

    return { success: true };
  }
}
