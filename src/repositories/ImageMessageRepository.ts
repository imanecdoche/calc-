import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { FirebaseStorageRepository } from './FirebaseStorageRepository';

export class ImageMessageRepository {
  private static instance: ImageMessageRepository | null = null;
  private storageRepo = FirebaseStorageRepository.getInstance();

  public static getInstance(): ImageMessageRepository {
    if (!ImageMessageRepository.instance) {
      ImageMessageRepository.instance = new ImageMessageRepository();
    }
    return ImageMessageRepository.instance;
  }

  /**
   * Uploads image file to Firebase Storage, then saves metadata to Firestore as a Message.
   */
  public async sendImageMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File | Blob,
    caption?: string,
    replyTo?: { messageId: string; text: string; senderId: string }
  ): Promise<string> {
    const timestamp = Date.now();
    const tempId = 'img_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);

    // 1. Upload compressed image file to Firebase Storage
    const imageUrl = await this.storageRepo.uploadImage(file, tempId);

    // 2. Store message metadata in Firestore
    const messagesCollection = collection(db, 'conversations', conversationId, 'messages');

    const docData: any = {
      senderId,
      receiverId,
      imageUrl,
      timestamp,
      status: 'sent',
      text: caption && caption.trim() ? caption.trim() : '[Photo]'
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
