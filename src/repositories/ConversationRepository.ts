import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';

export interface Conversation {
  conversationId: string;
  participants: string[]; // array of uids
  usernames: string[];    // array of usernames
  lastActivity: number;
}

export class ConversationRepository {
  private conversationsCollection = collection(db, 'conversations');

  /**
   * Helper to generate a unique, consistent Conversation ID from two usernames.
   */
  public generateConversationId(usernameA: string, usernameB: string): string {
    const list = [usernameA.trim().toLowerCase(), usernameB.trim().toLowerCase()];
    list.sort(); // alphabetical sorting
    return list.join('_');
  }

  /**
   * Get or create a conversation between two users.
   */
  public async getOrCreateConversation(
    usernameA: string,
    uidA: string,
    usernameB: string,
    uidB: string
  ): Promise<Conversation> {
    const conversationId = this.generateConversationId(usernameA, usernameB);
    const docRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as Conversation;
    }

    // Otherwise create the conversation document
    const conversation: Conversation = {
      conversationId,
      participants: [uidA, uidB],
      usernames: [usernameA.toLowerCase(), usernameB.toLowerCase()],
      lastActivity: Date.now()
    };

    await setDoc(docRef, conversation);
    return conversation;
  }
}
