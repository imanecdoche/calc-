import { PeerConnectionManager } from './PeerConnectionManager';
import { AudioManager } from './AudioManager';
import { CallIceCandidate } from '../models/CallState';

export class WebRTCManager {
  private static instance: WebRTCManager | null = null;
  private pcManager: PeerConnectionManager;
  private audioManager: AudioManager;
  private remoteAudio: HTMLAudioElement;
  private remoteStream: MediaStream | null = null;

  private constructor() {
    this.pcManager = new PeerConnectionManager();
    this.audioManager = AudioManager.getInstance();
    
    // Create an in-memory audio element for auto-playing remote audio
    this.remoteAudio = new Audio();
    this.remoteAudio.autoplay = true;
    this.remoteAudio.volume = 1.0;
  }

  public static getInstance(): WebRTCManager {
    if (!this.instance) {
      this.instance = new WebRTCManager();
    }
    return this.instance;
  }

  // Get current peer connection manager
  public getPCManager(): PeerConnectionManager {
    return this.pcManager;
  }

  // Initialize and return local media stream
  public async startLocalAudio(): Promise<MediaStream | null> {
    const stream = await this.audioManager.requestMicrophonePermission();
    return stream;
  }

  // Set up connection for Caller
  public async prepareCallerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void
  ): Promise<RTCSessionDescriptionInit> {
    this.pcManager.close();
    this.remoteStream = null;

    // 1. Get local mic stream
    const localStream = await this.startLocalAudio();
    if (!localStream) {
      throw new Error('Microphone permission required for calling');
    }

    // 2. Init peer connection
    this.pcManager.initializePeerConnection(
      onIceCandidate,
      (remoteStr) => {
        console.log('Caller received remote stream track!');
        this.remoteStream = remoteStr;
        this.remoteAudio.srcObject = remoteStr;
      },
      onConnectionStateChange
    );

    // 3. Add tracks
    this.pcManager.addLocalStream(localStream);

    // 4. Create offer
    const offer = await this.pcManager.createOffer();
    return offer;
  }

  // Set up connection for Receiver
  public async prepareReceiverConnection(
    offer: RTCSessionDescriptionInit,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void
  ): Promise<RTCSessionDescriptionInit> {
    this.pcManager.close();
    this.remoteStream = null;

    // 1. Get local mic stream
    const localStream = await this.startLocalAudio();
    if (!localStream) {
      throw new Error('Microphone permission required for answering call');
    }

    // 2. Init peer connection
    this.pcManager.initializePeerConnection(
      onIceCandidate,
      (remoteStr) => {
        console.log('Receiver received remote stream track!');
        this.remoteStream = remoteStr;
        this.remoteAudio.srcObject = remoteStr;
      },
      onConnectionStateChange
    );

    // 3. Add tracks
    this.pcManager.addLocalStream(localStream);

    // 4. Create answer
    const answer = await this.pcManager.createAnswer(offer);
    return answer;
  }

  // Accept/apply answer on Caller side
  public async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pcManager.setAnswer(answer);
  }

  // Inject a candidate
  public async addIceCandidate(candidate: CallIceCandidate): Promise<void> {
    await this.pcManager.addRemoteCandidate(candidate);
  }

  // Speaker toggle wrapper
  public async toggleSpeakerphone(): Promise<boolean> {
    return await this.audioManager.toggleSpeaker(this.remoteAudio);
  }

  public getSpeakerState(): boolean {
    return this.audioManager.getSpeakerState();
  }

  // Mute wrapper
  public toggleMuteMicrophone(): boolean {
    return this.audioManager.toggleMute();
  }

  public getMuteState(): boolean {
    return this.audioManager.getMuteState();
  }

  // Hang up and cleanup everything
  public terminateSession() {
    this.pcManager.close();
    this.audioManager.clearLocalStream();
    this.remoteStream = null;
    this.remoteAudio.srcObject = null;
  }
}
