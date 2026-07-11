export type CallStatus = 
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'ended'
  | 'busy'
  | 'declined'
  | 'timeout';

export interface CallSession {
  id: string;
  caller: string;
  receiver: string;
  status: CallStatus;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  iceCandidates?: CallIceCandidate[] | null;
  createdAt: number;
  endedAt?: number | null;
}

export interface CallIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  type: 'caller' | 'receiver';
}
