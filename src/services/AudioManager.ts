export class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private ringingOscillators: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }[] = [];
  private ringInterval: any = null;
  private isMuted: boolean = false;
  private isSpeakerOn: boolean = false;
  private localStream: MediaStream | null = null;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Request Mic permission
  public async requestMicrophonePermission(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return null;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.isMuted = false;
  }

  public clearLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  // Toggle Mute on current track
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  // Toggle Speaker Output
  public async toggleSpeaker(remoteAudioElement: HTMLAudioElement | null): Promise<boolean> {
    this.isSpeakerOn = !this.isSpeakerOn;
    
    if (!remoteAudioElement) return this.isSpeakerOn;

    // Standard setSinkId for browsers that support speaker selection
    if ('setSinkId' in remoteAudioElement) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');
        
        if (audioOutputs.length > 0) {
          // Find external speaker device or use default/alternative sink
          const speaker = audioOutputs.find(
            (d) => 
              d.label.toLowerCase().includes('speaker') || 
              d.label.toLowerCase().includes('loudspeaker') ||
              d.label.toLowerCase().includes('headphones')
          ) || audioOutputs[0];

          if (this.isSpeakerOn && speaker) {
            await (remoteAudioElement as any).setSinkId(speaker.deviceId);
          } else {
            await (remoteAudioElement as any).setSinkId(''); // default sink (earpiece / standard handset output)
          }
        }
      } catch (err) {
        console.warn('Failed to setSinkId for speaker toggle:', err);
      }
    }
    return this.isSpeakerOn;
  }

  public getSpeakerState(): boolean {
    return this.isSpeakerOn;
  }

  // TONES GENERATOR FOR IMMERSIVE CALLING FEEDBACK

  // Play "Calling..." Ringback Tone (Caller side)
  public startRingbackTone() {
    this.stopAllTones();
    this.initAudioContext();
    if (!this.audioContext) return;

    const playToneGroup = () => {
      if (!this.audioContext) return;
      
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc1.frequency.value = 440; // USA/UK Ringback standard
      osc2.frequency.value = 480;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioContext.destination);

      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.1);
      
      // Ring sequence: 2 seconds on, 4 seconds off
      gain.gain.setValueAtTime(0.08, this.audioContext.currentTime + 2.0);
      gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2.1);

      osc1.start();
      osc2.start();

      osc1.stop(this.audioContext.currentTime + 2.2);
      osc2.stop(this.audioContext.currentTime + 2.2);

      this.ringingOscillators.push({ osc1, osc2, gain });
    };

    // Initial play
    playToneGroup();
    
    // Interval of 6 seconds
    this.ringInterval = setInterval(() => {
      playToneGroup();
    }, 6000);
  }

  // Play "Incoming Call..." Ringtone (Receiver side)
  public startIncomingRingtone() {
    this.stopAllTones();
    this.initAudioContext();
    if (!this.audioContext) return;

    const playIncomingToneGroup = () => {
      if (!this.audioContext) return;
      
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc1.frequency.value = 453; // Standard aesthetic ring frequencies
      osc2.frequency.value = 440;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioContext.destination);

      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.audioContext.currentTime + 0.05);
      
      // Repeating double chime
      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.55);

      gain.gain.setValueAtTime(0, this.audioContext.currentTime + 0.7);
      gain.gain.linearRampToValueAtTime(0.12, this.audioContext.currentTime + 0.75);
      gain.gain.setValueAtTime(0.12, this.audioContext.currentTime + 1.25);
      gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.4);

      osc1.start();
      osc2.start();

      osc1.stop(this.audioContext.currentTime + 1.5);
      osc2.stop(this.audioContext.currentTime + 1.5);

      this.ringingOscillators.push({ osc1, osc2, gain });
    };

    playIncomingToneGroup();
    this.ringInterval = setInterval(() => {
      playIncomingToneGroup();
    }, 3500);
  }

  // Play "Call Ended" short disconnection sweep tone
  public playEndCallTone() {
    this.stopAllTones();
    this.initAudioContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(350, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.45);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);
  }

  // Play simple quick click/button feedback sound
  public playClickTone() {
    this.initAudioContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.08);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  // Stop everything
  public stopAllTones() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.ringingOscillators.forEach(({ osc1, osc2, gain }) => {
      try {
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
        gain.disconnect();
      } catch (e) {}
    });
    this.ringingOscillators = [];
  }
}
