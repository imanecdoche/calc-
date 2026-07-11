import { SessionCleaner } from './SessionCleaner';

export type AudioPlaybackListener = (
  messageId: string | null,
  state: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
  }
) => void;

export class AudioPlayerManager {
  private static instance: AudioPlayerManager | null = null;
  
  // HTMLAudioElement and metadata
  private audio: HTMLAudioElement | null = null;
  private currentMessageId: string | null = null;
  private playbackRate: number = 1.0;
  
  // Temporary cache: messageId -> Object URL (blob)
  private objectUrlCache: Map<string, string> = new Map();
  private isDownloading: Set<string> = new Set();

  private listeners: Set<AudioPlaybackListener> = new Set();
  private progressInterval: any = null;

  public static getInstance(): AudioPlayerManager {
    if (!AudioPlayerManager.instance) {
      AudioPlayerManager.instance = new AudioPlayerManager();
    }
    return AudioPlayerManager.instance;
  }

  private constructor() {
    // Intercept SessionCleaner wipe event to auto-clear temporary voice note cache
    const originalWipe = SessionCleaner.getInstance().wipeSession;
    SessionCleaner.getInstance().wipeSession = () => {
      originalWipe.call(SessionCleaner.getInstance());
      this.clearCache();
    };

    // Clean up cache on browser close or refresh
    window.addEventListener('beforeunload', () => {
      this.clearCache();
    });
  }

  /**
   * Subscribe to playback status updates.
   */
  public subscribe(listener: AudioPlaybackListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener(this.currentMessageId, {
      isPlaying: this.isPlaying(),
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio ? (isNaN(this.audio.duration) ? 0 : this.audio.duration) : 0,
      playbackRate: this.playbackRate,
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitUpdate() {
    const isPlaying = this.isPlaying();
    const currentTime = this.audio ? this.audio.currentTime : 0;
    const duration = this.audio ? (isNaN(this.audio.duration) ? 0 : this.audio.duration) : 0;
    
    this.listeners.forEach((listener) => {
      listener(this.currentMessageId, {
        isPlaying,
        currentTime,
        duration,
        playbackRate: this.playbackRate,
      });
    });
  }

  /**
   * Check if audio is currently playing.
   */
  public isPlaying(messageId?: string): boolean {
    if (!this.audio) return false;
    const active = !this.audio.paused && !this.audio.ended;
    if (messageId) {
      return active && this.currentMessageId === messageId;
    }
    return active;
  }

  /**
   * Get current playing message ID.
   */
  public getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  /**
   * Play or resume a voice note.
   */
  public async play(messageId: string, audioUrl: string): Promise<void> {
    // 1. If it is already playing this exact message, just do nothing or resume
    if (this.currentMessageId === messageId && this.audio) {
      if (this.audio.paused) {
        await this.audio.play();
        this.startProgressTracker();
        this.emitUpdate();
      }
      return;
    }

    // 2. Stop any other audio that's currently playing
    this.stopCurrent();

    this.currentMessageId = messageId;
    this.emitUpdate();

    try {
      // 3. Resolve the audio source (either cached Object URL or download it now)
      let sourceUrl = this.objectUrlCache.get(messageId);
      
      if (!sourceUrl) {
        if (this.isDownloading.has(messageId)) return;
        this.isDownloading.add(messageId);
        
        // Fetch audio file securely from Storage to store in memory cache
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('Gagal mendownload audio dari server.');
        
        const blob = await response.blob();
        sourceUrl = URL.createObjectURL(blob);
        this.objectUrlCache.set(messageId, sourceUrl);
        this.isDownloading.delete(messageId);
      }

      // 4. Initialize and play HTMLAudioElement
      this.audio = new Audio(sourceUrl);
      this.audio.playbackRate = this.playbackRate;

      this.audio.addEventListener('loadedmetadata', () => {
        this.emitUpdate();
      });

      this.audio.addEventListener('ended', () => {
        this.stopProgressTracker();
        this.emitUpdate();
      });

      this.audio.addEventListener('pause', () => {
        this.emitUpdate();
      });

      this.audio.addEventListener('play', () => {
        this.emitUpdate();
      });

      await this.audio.play();
      this.startProgressTracker();
      this.emitUpdate();

    } catch (error) {
      console.error('Playback failed:', error);
      this.isDownloading.delete(messageId);
      this.stopCurrent();
      throw error;
    }
  }

  /**
   * Pause the currently playing audio.
   */
  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.stopProgressTracker();
      this.emitUpdate();
    }
  }

  /**
   * Toggle speed between 1x and 2x.
   */
  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.emitUpdate();
  }

  /**
   * Seek audio to a specific progress percentage.
   */
  public seekTo(percentage: number): void {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = (percentage / 100) * this.audio.duration;
      this.emitUpdate();
    }
  }

  /**
   * Stop current audio playback cleanly.
   */
  public stopCurrent(): void {
    this.stopProgressTracker();
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch (e) {}
      this.audio = null;
    }
    this.currentMessageId = null;
    this.emitUpdate();
  }

  /**
   * Completely clear cached file blob object URLs.
   */
  public clearCache(): void {
    this.stopCurrent();
    
    // Revoke object URLs to free up memory immediately
    this.objectUrlCache.forEach((objectUrl) => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error('Error revoking Object URL:', e);
      }
    });

    this.objectUrlCache.clear();
    this.isDownloading.clear();
    console.log('Audio player cache cleared successfully.');
  }

  private startProgressTracker() {
    this.stopProgressTracker();
    this.progressInterval = setInterval(() => {
      this.emitUpdate();
    }, 100);
  }

  private stopProgressTracker() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
