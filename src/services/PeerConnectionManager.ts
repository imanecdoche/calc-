import { CallIceCandidate } from '../models/CallState';

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  private readonly iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];

  constructor() {}

  public initializePeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ): RTCPeerConnection {
    this.close();

    this.onConnectionStateChangeCallback = onConnectionStateChange || null;

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    this.peerConnection = pc;

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Handle incoming audio stream tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onTrack(event.streams[0]);
      }
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => {
      console.log('RTCPeerConnection state:', pc.connectionState);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }

  // Add local mic stream tracks to the connection
  public addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    if (!this.peerConnection) return;

    stream.getTracks().forEach((track) => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, stream);
      }
    });
  }

  // Create Caller SDP Offer
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  // Create Receiver SDP Answer
  public async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    // Set Remote Offer
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create Local Answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  // Set SDP Answer on Caller side
  public async setAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }
    
    if (this.peerConnection.signalingState !== 'stable') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  // Add remote candidate
  public async addRemoteCandidate(candidateData: CallIceCandidate): Promise<void> {
    if (!this.peerConnection) return;
    try {
      const candidate = new RTCIceCandidate({
        candidate: candidateData.candidate,
        sdpMid: candidateData.sdpMid,
        sdpMLineIndex: candidateData.sdpMLineIndex
      });
      await this.peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.warn('Failed to add remote ICE Candidate:', e);
    }
  }

  // Close peer connection
  public close() {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.localStream = null;
    this.onConnectionStateChangeCallback = null;
  }
}
