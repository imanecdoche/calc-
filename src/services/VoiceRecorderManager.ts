export class VoiceRecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private durationInterval: any = null;
  private onDurationUpdate: ((duration: number) => void) | null = null;
  private onWaveformUpdate: ((levels: number[]) => void) | null = null;
  private maxDuration = 300; // 5 minutes in seconds
  private onMaxDurationReached: (() => void) | null = null;
  private isRecordingActive = false;

  public constructor() {}

  /**
   * Request microphone permissions from the user.
   */
  public async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, this was just for checking/requesting permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.warn('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Starts recording audio from the microphone.
   */
  public async startRecording(
    onDuration: (duration: number) => void,
    onWaveform: (levels: number[]) => void,
    onMaxReached: () => void
  ): Promise<void> {
    if (this.isRecordingActive) return;

    this.onDurationUpdate = onDuration;
    this.onWaveformUpdate = onWaveform;
    this.onMaxDurationReached = onMaxReached;
    this.chunks = [];

    try {
      // Stream mono sound to keep the size optimized
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Compress audio by setting low bitrate (perfect for speech)
      let options: MediaRecorderOptions = { audioBitsPerSecond: 24000 };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options.mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      // Set up AudioContext & AnalyserNode for waveform rendering
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64; // Small fft size for quick simple indicators
          source.connect(this.analyser);
        }
      } catch (err) {
        console.warn('Failed to initialize audio analyser context:', err);
      }

      this.mediaRecorder.start(100); // chunk size 100ms
      this.isRecordingActive = true;
      this.startTime = Date.now();

      // Setup real-time duration updates
      this.durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.onDurationUpdate) {
          this.onDurationUpdate(elapsed);
        }

        // Fetch analyser frequency levels for visual waveform feedback
        if (this.analyser && this.onWaveformUpdate) {
          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.analyser.getByteFrequencyData(dataArray);
          // Scale levels to 0 - 100
          const scaled = Array.from(dataArray).slice(0, 16).map(val => Math.round((val / 255) * 100));
          this.onWaveformUpdate(scaled);
        }

        // Limit maximum duration to 5 mins
        if (elapsed >= this.maxDuration) {
          this.stopAndComplete();
        }
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.cleanup();
      throw error;
    }
  }

  private stopAndComplete() {
    if (this.onMaxDurationReached) {
      this.onMaxDurationReached();
    }
  }

  /**
   * Stop the active recording and return the audio Blob.
   */
  public async stopRecording(): Promise<{ blob: Blob; duration: number } | null> {
    if (!this.isRecordingActive || !this.mediaRecorder) return null;

    const duration = Math.min(this.maxDuration, Math.floor((Date.now() - this.startTime) / 1000));

    return new Promise((resolve) => {
      if (this.mediaRecorder) {
        this.mediaRecorder.onstop = () => {
          const mimeType = this.chunks[0]?.type || 'audio/webm';
          const blob = new Blob(this.chunks, { type: mimeType });
          this.cleanup();
          resolve({ blob, duration });
        };
        this.mediaRecorder.stop();
      } else {
        this.cleanup();
        resolve(null);
      }
    });
  }

  /**
   * Cancel and discard the active recording.
   */
  public cancelRecording(): void {
    if (!this.isRecordingActive) return;
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = () => {}; // discard data
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  /**
   * Cleanup resources.
   */
  private cleanup() {
    this.isRecordingActive = false;
    
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    this.onDurationUpdate = null;
    this.onWaveformUpdate = null;
    this.onMaxDurationReached = null;
  }
}
