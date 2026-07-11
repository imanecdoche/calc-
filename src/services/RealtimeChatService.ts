import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  limit, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { Message } from '../models/Message';

export class RealtimeChatService {
  /**
   * Subscribe to messages in a specific conversation.
   * Calls the callback with the updated list of messages whenever they change.
   */
  public subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const messages: Message[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          timestamp: data.timestamp,
          status: data.status || 'sent'
        };
      });
      callback(messages);
    }, (error) => {
      console.error('Error listening to realtime messages:', error);
    });
  }

  /**
   * Send a message to a specific conversation.
   */
  public async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<void> {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const timestamp = Date.now();

    // 1. Add the message document with status 'sent'
    await addDoc(messagesCollection, {
      senderId,
      receiverId,
      text,
      timestamp,
      status: 'sent'
    });

    // 2. Update the parent conversation's lastActivity
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastActivity: timestamp
    });
  }

  /**
   * Clear all chats in a specific conversation for the session (optional, used if session ends).
   */
  public async clearConversationMessages(conversationId: string): Promise<void> {
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollection, limit(100));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}
