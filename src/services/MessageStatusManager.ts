import { doc, updateDoc, writeBatch, collection } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { Message } from '../models/Message';

export class MessageStatusManager {
  /**
   * Batch-updates unread messages that we received in a conversation to 'delivered'.
   */
  public async markAsDelivered(
    conversationId: string,
    messages: Message[],
    myUsername: string
  ): Promise<void> {
    const unreadMessages = messages.filter(
      (msg) => msg.receiverId === myUsername && msg.status !== 'delivered'
    );

    if (unreadMessages.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadMessages.forEach((msg) => {
        const msgRef = doc(db, 'conversations', conversationId, 'messages', msg.id);
        batch.update(msgRef, { status: 'delivered' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking messages as delivered:', err);
    }
  }
}
