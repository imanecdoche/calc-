import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  arrayUnion, 
  getDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/FirebaseModule';
import { CallSession, CallStatus, CallIceCandidate } from '../models/CallState';

export class SignalingRepository {
  private static instance: SignalingRepository | null = null;

  private constructor() {}

  public static getInstance(): SignalingRepository {
    if (!this.instance) {
      this.instance = new SignalingRepository();
    }
    return this.instance;
  }

  // Create a new Call document in Firestore
  public async createCall(
    callId: string,
    caller: string,
    receiver: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      await setDoc(callRef, {
        caller,
        receiver,
        status: 'calling',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        answer: null,
        iceCandidates: [],
        createdAt: Date.now(),
        endedAt: null
      });
    } catch (error) {
      console.error('Error creating call:', error);
      throw error;
    }
  }

  // Update call status
  public async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      const updates: any = { status };
      if (status === 'ended' || status === 'declined' || status === 'busy' || status === 'timeout') {
        updates.endedAt = Date.now();
      }
      await updateDoc(callRef, updates);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  // Set SDP Answer (Receiver side)
  public async setCallAnswer(callId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: 'connecting'
      });
    } catch (error) {
      console.error('Error setting call answer:', error);
      throw error;
    }
  }

  // Append ICE Candidate to arrays
  public async addIceCandidate(
    callId: string,
    candidate: RTCIceCandidate,
    type: 'caller' | 'receiver'
  ): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      const rawCandidate: CallIceCandidate = {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        type
      };
      await updateDoc(callRef, {
        iceCandidates: arrayUnion(rawCandidate)
      });
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Listen to a specific call's status and updates
  public subscribeToCall(
    callId: string,
    onUpdate: (call: CallSession) => void,
    onError?: (err: any) => void
  ): () => void {
    const callRef = doc(db, 'calls', callId);
    return onSnapshot(
      callRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          onUpdate({
            id: snapshot.id,
            caller: data.caller,
            receiver: data.receiver,
            status: data.status,
            offer: data.offer,
            answer: data.answer,
            iceCandidates: data.iceCandidates,
            createdAt: data.createdAt,
            endedAt: data.endedAt
          });
        }
      },
      (error) => {
        console.error('Error subscribing to call:', error);
        if (onError) onError(error);
      }
    );
  }

  // Subscribe to incoming calls where receiver is me and status is 'calling'
  public subscribeToIncomingCalls(
    myUsername: string,
    onCallReceived: (call: CallSession) => void
  ): () => void {
    const callsCollection = collection(db, 'calls');
    // Simple query: receiver matches myUsername, status is 'calling', created within last 2 minutes
    const twoMinutesAgo = Date.now() - 120000;
    const q = query(
      callsCollection,
      where('receiver', '==', myUsername),
      where('status', '==', 'calling')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          // Filter locally for active, recent calls to prevent stale notifications
          if (data.createdAt > twoMinutesAgo) {
            onCallReceived({
              id: docSnap.id,
              caller: data.caller,
              receiver: data.receiver,
              status: data.status,
              offer: data.offer,
              answer: data.answer,
              iceCandidates: data.iceCandidates,
              createdAt: data.createdAt,
              endedAt: data.endedAt
            });
          }
        });
      },
      (error) => {
        console.error('Error listening to incoming calls:', error);
      }
    );
  }

  // Clean up a call doc (optional)
  public async deleteCallDoc(callId: string): Promise<void> {
    try {
      const callRef = doc(db, 'calls', callId);
      await deleteDoc(callRef);
    } catch (e) {
      console.error('Error deleting call document:', e);
    }
  }
}
