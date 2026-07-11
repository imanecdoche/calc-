import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';

export class TypingManager {
  private lastTypingSent: number = 0;
  private typingTimeout: any = null;

  /**
   * Sets our typing state in the database.
   * Throttles calls to once every 1.5 seconds to conserve database writes.
   */
  public async setTyping(conversationId: string, myUsername: string) {
    const now = Date.now();
    
    // Throttle database writes
    if (now - this.lastTypingSent > 1500) {
      this.lastTypingSent = now;
      try {
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
          [`typing.${myUsername}`]: now
        });
      } catch (err) {
        console.error('Error writing typing status:', err);
      }
    }

    // Automatically schedule clearing the typing state in database after 3 seconds
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.typingTimeout = setTimeout(async () => {
      try {
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
          [`typing.${myUsername}`]: 0
        });
      } catch (err) {
        console.error('Error clearing typing status:', err);
      }
    }, 3000);
  }

  /**
   * Listens to the conversation's typing state.
   * Calls onTypingChanged(isTyping) when the target user's status changes.
   */
  public listenToTyping(
    conversationId: string,
    targetUsername: string,
    onTypingChanged: (isTyping: boolean) => void
  ): () => void {
    const conversationRef = doc(db, 'conversations', conversationId);
    let checkInterval: any = null;

    const unsubscribe = onSnapshot(conversationRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const typingMap = data.typing || {};
      const lastActive = typingMap[targetUsername] || 0;

      const evaluate = () => {
        const currentlyTyping = Date.now() - lastActive < 3000;
        onTypingChanged(currentlyTyping);
      };

      evaluate();

      // Set/reset interval to tick and re-evaluate so it automatically turns off after 3 seconds
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = setInterval(() => {
        evaluate();
      }, 1000);
    }, (err) => {
      console.error('Error listening to typing:', err);
    });

    return () => {
      unsubscribe();
      if (checkInterval) clearInterval(checkInterval);
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
    };
  }
}
