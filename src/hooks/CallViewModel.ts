import { useState, useEffect, useRef } from 'react';
import { CallRepository } from '../repositories/CallRepository';
import { SignalingRepository } from '../repositories/SignalingRepository';
import { WebRTCManager } from '../services/WebRTCManager';
import { CallSession, CallStatus } from '../models/CallState';

export function useCallViewModel(myUsername: string | null) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);

  const callRepo = CallRepository.getInstance();
  const signalingRepo = SignalingRepository.getInstance();
  const webrtcManager = WebRTCManager.getInstance();

  // 1. Listen for incoming calls on Firestore as soon as myUsername is established
  useEffect(() => {
    if (!myUsername) return;

    console.log(`Call listener registered for username: @${myUsername}`);
    const unsubscribe = signalingRepo.subscribeToIncomingCalls(myUsername, (incomingCall) => {
      // If we are already in an active call, mark the incoming call as 'busy'
      const currentActive = callRepo.getActiveCall();
      if (currentActive && currentActive.id !== incomingCall.id) {
        console.log('User is busy. Declining incoming call with busy status');
        signalingRepo.updateCallStatus(incomingCall.id, 'busy');
        return;
      }

      // Register the incoming call and update state
      if (!currentActive) {
        callRepo.registerIncomingCall(incomingCall);
        setActiveCall(incomingCall);
        setCallStatus('calling'); // Inbound alert triggers 'calling' / 'ringing' UI
      }
    });

    return () => {
      unsubscribe();
    };
  }, [myUsername]);

  // 2. Call connected timer
  useEffect(() => {
    let interval: any = null;
    if (callStatus === 'connected') {
      setDuration(0);
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  // 3. Initiate an outgoing call
  const startCall = async (targetUsername: string) => {
    if (!myUsername) return;

    try {
      setCallStatus('calling');
      setIsMuted(false);
      setIsSpeakerOn(false);

      const callId = await callRepo.initiateCall(
        myUsername,
        targetUsername,
        (status) => {
          setCallStatus(status);
        },
        () => {
          // Callback when call ends
          setActiveCall(null);
          setCallStatus('idle');
        }
      );

      // Save initial local call representation
      setActiveCall(callRepo.getActiveCall());
    } catch (error) {
      console.error('Failed to start call:', error);
      setActiveCall(null);
      setCallStatus('idle');
    }
  };

  // 4. Accept incoming call
  const acceptCall = async () => {
    if (!activeCall) return;

    try {
      await callRepo.acceptCall(
        activeCall.id,
        (status) => {
          setCallStatus(status);
        },
        () => {
          setActiveCall(null);
          setCallStatus('idle');
        }
      );
    } catch (error) {
      console.error('Failed to accept call:', error);
      setActiveCall(null);
      setCallStatus('idle');
    }
  };

  // 5. Decline incoming call
  const declineCall = async () => {
    if (!activeCall) return;
    await callRepo.declineCall(activeCall.id);
    setActiveCall(null);
    setCallStatus('idle');
  };

  // 6. Hang up active call
  const hangupCall = async () => {
    if (!activeCall) return;
    await callRepo.hangupCall(() => {
      setActiveCall(null);
      setCallStatus('idle');
    });
  };

  // 7. Toggle Mute
  const toggleMute = () => {
    const muted = webrtcManager.toggleMuteMicrophone();
    setIsMuted(muted);
  };

  // 8. Toggle Speaker
  const toggleSpeaker = async () => {
    const speaker = await webrtcManager.toggleSpeakerphone();
    setIsSpeakerOn(speaker);
  };

  // Helper formatting for duration timer display (MM:SS)
  const getFormattedDuration = (): string => {
    const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
    const seconds = (duration % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return {
    activeCall,
    callStatus,
    duration: getFormattedDuration(),
    isMuted,
    isSpeakerOn,
    startCall,
    acceptCall,
    declineCall,
    hangupCall,
    toggleMute,
    toggleSpeaker
  };
}

export type CallViewModelType = ReturnType<typeof useCallViewModel>;
