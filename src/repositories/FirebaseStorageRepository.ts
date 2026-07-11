import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/FirebaseModule';

export class FirebaseStorageRepository {
  private static instance: FirebaseStorageRepository | null = null;

  public static getInstance(): FirebaseStorageRepository {
    if (!FirebaseStorageRepository.instance) {
      FirebaseStorageRepository.instance = new FirebaseStorageRepository();
    }
    return FirebaseStorageRepository.instance;
  }

  /**
   * Uploads a voice note Blob to Firebase Storage and returns the download URL.
   */
  public async uploadAudio(blob: Blob, messageId: string): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('Tidak ada koneksi internet. Silakan periksa koneksi Anda.');
    }

    // Limit maximum size to 10MB as a sanity check
    const MAX_SIZE_MB = 10;
    if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`File terlalu besar. Maksimum ukuran file adalah ${MAX_SIZE_MB}MB.`);
    }

    try {
      // Create a unique file name/path
      const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const fileRef = ref(storage, `voicenotes/${messageId}.${extension}`);
      
      const metadata = {
        contentType: blob.type || 'audio/webm',
      };

      // Upload bytes
      await uploadBytes(fileRef, blob, metadata);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error: any) {
      console.error('Error uploading voice note to Firebase Storage:', error);
      throw new Error(error.message || 'Gagal mengupload rekaman suara.');
    }
  }

  /**
   * Deletes a voice note from Firebase Storage.
   */
  public async deleteAudioByUrl(audioUrl: string): Promise<void> {
    if (!audioUrl) return;
    try {
      // Extract path or ref from the URL or create a ref from the full URL
      const fileRef = ref(storage, audioUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting audio file from storage:', error);
    }
  }
}
