import { SignalingRepository } from './SignalingRepository';
import { WebRTCManager } from '../services/WebRTCManager';
import { AudioManager } from '../services/AudioManager';
import { CallSession, CallStatus, CallIceCandidate } from '../models/CallState';

export class CallRepository {
  private static instance: CallRepository | null = null;
  private signalingRepo: SignalingRepository;
  private webrtcManager: WebRTCManager;
  private audioManager: AudioManager;

  private activeCall: CallSession | null = null;
  private callListenerUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.signalingRepo = SignalingRepository.getInstance();
    this.webrtcManager = WebRTCManager.getInstance();
    this.audioManager = AudioManager.getInstance();
  }

  public static getInstance(): CallRepository {
    if (!this.instance) {
      this.instance = new CallRepository();
    }
    return this.instance;
  }

  public getActiveCall(): CallSession | null {
    return this.activeCall;
  }

  // Caller: Start Outgoing Call
  public async initiateCall(
    caller: string,
    receiver: string,
    onStateChange: (status: CallStatus) => void,
    onCallEnded: () => void
  ): Promise<string> {
    const callId = `call_${caller}_${receiver}_${Date.now()}`;
    
    this.activeCall = {
      id: callId,
      caller,
      receiver,
      status: 'calling',
      createdAt: Date.now()
    };

    // 1. Play outbound ringback tone
    this.audioManager.startRingbackTone();

    try {
      // 2. Setup WebRTC peer connection and generate offer
      const offer = await this.webrtcManager.prepareCallerConnection(
        (candidate) => {
          // Send ICE candidate to Firestore
          this.signalingRepo.addIceCandidate(callId, candidate, 'caller');
        },
        (connectionState) => {
          this.handlePCConnectionStateChange(connectionState, onStateChange, onCallEnded);
        }
      );

      // 3. Write call to Firestore
      await this.signalingRepo.createCall(callId, caller, receiver, offer);

      // 4. Listen to call updates on Firestore
      this.subscribeToActiveCall(callId, onStateChange, onCallEnded);

      return callId;
    } catch (error) {
      console.error('Error initiating voice call:', error);
      this.endActiveCall(onCallEnded);
      throw error;
    }
  }

  // Receiver: Accept Incoming Call
  public async acceptCall(
    callId: string,
    onStateChange: (status: CallStatus) => void,
    onCallEnded: () => void
  ): Promise<void> {
    if (!this.activeCall) return;

    // Stop ringtone sound
    this.audioManager.stopAllTones();

    try {
      this.activeCall.status = 'connecting';
      onStateChange('connecting');

      const offer = this.activeCall.offer;
      if (!offer) {
        throw new Error('Caller offer not found');
      }

      // 1. Setup peer connection and generate Answer
      const answer = await this.webrtcManager.prepareReceiverConnection(
        offer,
        (candidate) => {
          this.signalingRepo.addIceCandidate(callId, candidate, 'receiver');
        },
        (connectionState) => {
          this.handlePCConnectionStateChange(connectionState, onStateChange, onCallEnded);
        }
      );

      // 2. Write SDP answer to Firestore (triggers Caller remote description)
      await this.signalingRepo.setCallAnswer(callId, answer);

      // 3. Start listening to Firestore call document (for candidates & end signals)
      this.subscribeToActiveCall(callId, onStateChange, onCallEnded);

    } catch (error) {
      console.error('Failed to accept incoming call:', error);
      this.declineCall(callId);
      this.endActiveCall(onCallEnded);
    }
  }

  // Receiver: Decline Call
  public async declineCall(callId: string): Promise<void> {
    this.audioManager.stopAllTones();
    this.audioManager.playEndCallTone();
    await this.signalingRepo.updateCallStatus(callId, 'declined');
    this.cleanupLocalSession();
  }

  // Caller/Receiver: End current active call
  public async hangupCall(onCallEnded: () => void): Promise<void> {
    if (!this.activeCall) return;
    
    const callId = this.activeCall.id;
    this.audioManager.stopAllTones();
    this.audioManager.playEndCallTone();

    // Update Firestore to 'ended'
    await this.signalingRepo.updateCallStatus(callId, 'ended');

    this.endActiveCall(onCallEnded);
  }

  // Force local session disconnect (e.g. on timeouts or busy states)
  public cleanupLocalSession() {
    this.audioManager.stopAllTones();
    this.webrtcManager.terminateSession();
    if (this.callListenerUnsubscribe) {
      this.callListenerUnsubscribe();
      this.callListenerUnsubscribe = null;
    }
    this.activeCall = null;
  }

  // Process incoming call alert (Pre-acceptance)
  public registerIncomingCall(call: CallSession) {
    this.activeCall = call;
    // Start playing ringtone sound
    this.audioManager.startIncomingRingtone();
  }

  // Subscribes to the active Firestore call session document
  private subscribeToActiveCall(
    callId: string,
    onStateChange: (status: CallStatus) => void,
    onCallEnded: () => void
  ) {
    if (this.callListenerUnsubscribe) {
      this.callListenerUnsubscribe();
    }

    // Set containing processed candidate string to avoid duplicates
    const processedCandidates = new Set<string>();

    this.callListenerUnsubscribe = this.signalingRepo.subscribeToCall(
      callId,
      async (call) => {
        if (!this.activeCall) return;

        const previousStatus = this.activeCall.status;
        this.activeCall = call;

        // Propagate state change to ViewModel
        if (call.status !== previousStatus) {
          onStateChange(call.status);
        }

        // If call was declined, busy, ended, or timed out, clean up
        if (
          call.status === 'declined' ||
          call.status === 'busy' ||
          call.status === 'ended' ||
          call.status === 'timeout'
        ) {
          this.audioManager.stopAllTones();
          this.audioManager.playEndCallTone();
          this.endActiveCall(onCallEnded);
          return;
        }

        // Caller side: Apply Remote SDP Answer when available
        if (
          this.activeCall.caller === call.caller &&
          call.status === 'connecting' &&
          call.answer &&
          previousStatus === 'calling'
        ) {
          // Stop ringback tone
          this.audioManager.stopAllTones();
          try {
            await this.webrtcManager.setRemoteAnswer(call.answer);
          } catch (e) {
            console.error('Failed to set remote answer:', e);
          }
        }

        // Gather and process new ICE candidates from remote peer
        if (call.iceCandidates && call.iceCandidates.length > 0) {
          const myRole = this.activeCall.caller === call.caller ? 'caller' : 'receiver';
          
          for (const cand of call.iceCandidates) {
            // Only add candidate if it belongs to the OTHER party
            if (cand.type !== myRole) {
              const uniqueKey = `${cand.candidate}_${cand.sdpMid}_${cand.sdpMLineIndex}`;
              if (!processedCandidates.has(uniqueKey)) {
                processedCandidates.add(uniqueKey);
                await this.webrtcManager.addIceCandidate(cand);
              }
            }
          }
        }
      },
      (err) => {
        console.error('Firestore active call channel error:', err);
        this.endActiveCall(onCallEnded);
      }
    );
  }

  // Handle peer connection state events
  private handlePCConnectionStateChange(
    state: RTCPeerConnectionState,
    onStateChange: (status: CallStatus) => void,
    onCallEnded: () => void
  ) {
    if (!this.activeCall) return;

    console.log('Orchestrator PC state changed to:', state);

    if (state === 'connected') {
      this.activeCall.status = 'connected';
      onStateChange('connected');
    } else if (state === 'connecting') {
      this.activeCall.status = 'connecting';
      onStateChange('connecting');
    } else if (state === 'disconnected') {
      this.activeCall.status = 'disconnected';
      onStateChange('disconnected');
    } else if (state === 'failed') {
      this.activeCall.status = 'ended';
      onStateChange('ended');
      this.endActiveCall(onCallEnded);
    }
  }

  // Ends and cleans up call fully
  private endActiveCall(onCallEnded: () => void) {
    this.cleanupLocalSession();
    onCallEnded();
  }
}
