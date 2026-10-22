import React, { useEffect, useRef } from 'react';
import { ParticipantTrackInfo } from '../../services/livekitClient';
import { MicOff, Radio, Signal, SignalLow, SignalMedium, User } from 'lucide-react';
import { ConnectionQuality } from 'livekit-client';

interface ParticipantVideoProps {
  participant: ParticipantTrackInfo;
  isLocal?: boolean;
}

export const ParticipantVideo: React.FC<ParticipantVideoProps> = ({ participant, isLocal = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Attach / update Video Track
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (participant.videoTrack && participant.isVideoOn) {
      const stream = new MediaStream([participant.videoTrack]);
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    } else {
      videoEl.srcObject = null;
    }

    return () => {
      if (videoEl) videoEl.srcObject = null;
    };
  }, [participant.videoTrack, participant.isVideoOn]);

  // Attach / update Audio Track (only for remote participants)
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || isLocal) return;

    if (participant.audioTrack && !participant.isMuted) {
      const stream = new MediaStream([participant.audioTrack]);
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});
      }
    } else {
      audioEl.srcObject = null;
    }

    return () => {
      if (audioEl) audioEl.srcObject = null;
    };
  }, [participant.audioTrack, participant.isMuted, isLocal]);

  // Network Quality Icon
  const renderQualityBadge = () => {
    const q = participant.connectionQuality;
    if (q === ConnectionQuality.Excellent || q === ConnectionQuality.Good) {
      return (
        <span className="flex items-center text-emerald-400 text-[10px]" title="Network: Strong">
          <Signal className="w-3 h-3" />
        </span>
      );
    }
    if (q === ConnectionQuality.Poor) {
      return (
        <span className="flex items-center text-amber-400 text-[10px]" title="Network: Fair">
          <SignalMedium className="w-3 h-3" />
        </span>
      );
    }
    if (q === ConnectionQuality.Lost) {
      return (
        <span className="flex items-center text-rose-400 text-[10px]" title="Network: Weak/Reconnecting">
          <SignalLow className="w-3 h-3 animate-pulse" />
        </span>
      );
    }
    return null;
  };

  const hasActiveVideo = Boolean(participant.videoTrack && participant.isVideoOn);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg min-h-[160px] max-h-[360px] w-full">
      {hasActiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar Placeholder when Camera is off */
        <div className="flex flex-col items-center justify-center gap-2 p-4 select-none">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xl transition-all ${
              participant.isSpeaking && !participant.isMuted
                ? 'ring-4 ring-emerald-500 scale-105 shadow-emerald-500/30'
                : ''
            }`}
            style={{
              background: isLocal
                ? 'linear-gradient(135deg, #0C66E4 0%, #0052CC 100%)'
                : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
            }}
          >
            {participant.name ? participant.name.slice(0, 2).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <span className="text-xs font-bold text-white max-w-[140px] truncate text-center">
            {participant.name} {isLocal && '(You)'}
          </span>
          {participant.isSpeaking && !participant.isMuted && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <Radio className="w-3 h-3 animate-pulse" /> Speaking
            </span>
          )}
        </div>
      )}

      {/* Remote Audio Track Element (Hidden) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {/* Bottom Name & State Badge */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5 shadow-xs">
          <span className="truncate max-w-[120px]">{participant.name} {isLocal && '(You)'}</span>
          {participant.isMuted ? (
            <MicOff className="w-3 h-3 text-rose-400 shrink-0" />
          ) : (
            participant.isSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          )}
        </div>

        <div className="px-1.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs flex items-center gap-1">
          {renderQualityBadge()}
        </div>
      </div>
    </div>
  );
};
