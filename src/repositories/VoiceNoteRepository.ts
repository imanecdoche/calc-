import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { FirebaseStorageRepository } from './FirebaseStorageRepository';

export class VoiceNoteRepository {
  private static instance: VoiceNoteRepository | null = null;
  private storageRepo = FirebaseStorageRepository.getInstance();

  public static getInstance(): VoiceNoteRepository {
    if (!VoiceNoteRepository.instance) {
      VoiceNoteRepository.instance = new VoiceNoteRepository();
    }
    return VoiceNoteRepository.instance;
  }

  /**
   * Uploads raw audio file to Storage, then saves metadata to Firestore as a Message.
   */
  public async sendVoiceNote(
    conversationId: string,
    senderId: string,
    receiverId: string,
    blob: Blob,
    duration: number,
    replyTo?: { messageId: string; text: string; senderId: string }
  ): Promise<string> {
    const timestamp = Date.now();
    const tempId = 'vn_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);

    // 1. Upload raw audio file to Firebase Storage
    const audioUrl = await this.storageRepo.uploadAudio(blob, tempId);

    // 2. Store message metadata in Firestore under the conversation's message collection
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');
    
    const docData: any = {
      senderId,
      receiverId,
      audioUrl,
      duration,
      timestamp,
      status: 'sent',
      text: '[Voice Note]' // fallback text representation
    };

    if (replyTo) {
      docData.replyToId = replyTo.messageId;
      docData.replyToText = replyTo.text;
      docData.replyToSender = replyTo.senderId;
    }

    const docRef = await addDoc(messagesCollection, docData);

    // 3. Update parent conversation activity
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastActivity: timestamp
    });

    return docRef.id;
  }
}
