import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CallViewModelType } from '../hooks/CallViewModel';
import IncomingCallScreen from './IncomingCallScreen';
import OutgoingCallScreen from './OutgoingCallScreen';
import CallScreen from './CallScreen';

interface CallOverlayProps {
  viewModel: CallViewModelType;
  myUsername: string;
}

export default function CallOverlay({ viewModel, myUsername }: CallOverlayProps) {
  const {
    activeCall,
    callStatus,
    duration,
    isMuted,
    isSpeakerOn,
    acceptCall,
    declineCall,
    hangupCall,
    toggleMute,
    toggleSpeaker
  } = viewModel;

  if (!activeCall || callStatus === 'idle') return null;

  const isCaller = activeCall.caller === myUsername;
  const peerName = isCaller ? activeCall.receiver : activeCall.caller;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="absolute inset-0 z-50 overflow-hidden"
      >
        {/* Case 1: Calling State */}
        {callStatus === 'calling' && (
          isCaller ? (
            <OutgoingCallScreen
              targetName={peerName}
              onEndCall={hangupCall}
            />
          ) : (
            <IncomingCallScreen
              callerName={peerName}
              onAccept={acceptCall}
              onDecline={declineCall}
            />
          )
        )}

        {/* Case 2: Ringing State (alternative representation, maps to Outgoing/Incoming) */}
        {callStatus === 'ringing' && (
          isCaller ? (
            <OutgoingCallScreen
              targetName={peerName}
              onEndCall={hangupCall}
            />
          ) : (
            <IncomingCallScreen
              callerName={peerName}
              onAccept={acceptCall}
              onDecline={declineCall}
            />
          )
        )}

        {/* Case 3: In-call connection and active connected loop states */}
        {(callStatus === 'connecting' || 
          callStatus === 'connected' || 
          callStatus === 'reconnecting' || 
          callStatus === 'disconnected') && (
          <CallScreen
            targetName={peerName}
            status={callStatus}
            duration={duration}
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={hangupCall}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
