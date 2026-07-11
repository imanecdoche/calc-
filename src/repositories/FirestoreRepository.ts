import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  DocumentData, 
  QueryConstraint 
} from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';

export class FirestoreRepository {
  public async saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  }

  public async getDocument(collectionName: string, docId: string): Promise<DocumentData | null> {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  public async queryDocuments(collectionName: string, ...constraints: QueryConstraint[]): Promise<DocumentData[]> {
    const collRef = collection(db, collectionName);
    const q = query(collRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data());
  }
}
