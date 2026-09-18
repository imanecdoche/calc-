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
   * Compresses an image if it exceeds limits to ensure fast upload and reasonable storage size.
   */
  private async compressImageIfNeeded(file: File | Blob): Promise<Blob> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        } else if (file.size < 1024 * 1024) {
          resolve(file);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  /**
   * Uploads an image File/Blob to Firebase Storage and returns the download URL.
   */
  public async uploadImage(file: File | Blob, messageId: string): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }

    const MAX_SIZE_MB = 25;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`File is too large. Maximum file size is ${MAX_SIZE_MB}MB.`);
    }

    try {
      const processedBlob = await this.compressImageIfNeeded(file);
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const fileRef = ref(storage, `chat_images/${messageId}.${extension}`);

      const metadata = {
        contentType: processedBlob.type || 'image/jpeg',
      };

      await uploadBytes(fileRef, processedBlob, metadata);
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error: any) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw new Error(error.message || 'Failed to upload photo.');
    }
  }

  /**
   * Deletes a voice note from Firebase Storage.
   */
  public async deleteAudioByUrl(audioUrl: string): Promise<void> {
    if (!audioUrl) return;
    try {
      const fileRef = ref(storage, audioUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting audio file from storage:', error);
    }
  }
}
