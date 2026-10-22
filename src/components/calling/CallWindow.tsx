import React, { useState, useEffect, useRef } from 'react';
import {
  livekitClient,
  ParticipantTrackInfo,
  LivekitConnectionStatus
} from '../../services/livekitClient';
import { ParticipantVideo } from './ParticipantVideo';
import { CallControls } from './CallControls';
import {
  Lock,
  ScreenShare,
  Maximize2,
  Minimize2,
  AlertCircle,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react';
import { Haptics } from '../../utils/haptics';

interface CallWindowProps {
  roomName: string;
  durationSeconds: number;
  onEndCall: () => void;
  isFloating?: boolean;
  onToggleFloating?: () => void;
}

export const CallWindow: React.FC<CallWindowProps> = ({
  roomName,
  durationSeconds,
  onEndCall,
  isFloating = false,
  onToggleFloating
}) => {
  const [connectionStatus, setConnectionStatus] = useState<LivekitConnectionStatus>('connected');
  const [participants, setParticipants] = useState<ParticipantTrackInfo[]>(livekitClient.getParticipants());
  const [isMuted, setIsMuted] = useState(livekitClient.isMuted());
  const [isVideoOn, setIsVideoOn] = useState(livekitClient.isCameraOn());
  const [isScreenSharing, setIsScreenSharing] = useState(livekitClient.isSharingScreen());
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    livekitClient.setCallbacks({
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') setPermissionError(null);
      },
      onParticipantsChange: (updated) => {
        setParticipants(updated);
        const local = updated.find(p => p.isLocal);
        if (local) {
          setIsMuted(local.isMuted);
          setIsVideoOn(local.isVideoOn);
          setIsScreenSharing(local.isScreenSharing);
        }
      },
      onError: (err) => {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
          setPermissionError('Microphone or camera access was blocked. Please check your browser site permissions.');
        }
      }
    });

    // Initial sync
    setParticipants(livekitClient.getParticipants());
  }, []);

  // Format call duration MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = async () => {
    Haptics.tap();
    const nextState = !isMuted;
    const success = await livekitClient.setMicrophoneEnabled(!nextState);
    if (success) setIsMuted(nextState);
  };

  const handleToggleVideo = async () => {
    Haptics.tap();
    const nextState = !isVideoOn;
    const success = await livekitClient.setCameraEnabled(nextState);
    if (success) setIsVideoOn(nextState);
  };

  const handleToggleScreenShare = async () => {
    Haptics.tap();
    const nextState = !isScreenSharing;
    const success = await livekitClient.setScreenShareEnabled(nextState);
    if (success) setIsScreenSharing(nextState);
  };

  // Find active screen sharing track if any participant is sharing
  const screenSharer = participants.find(p => p.screenTrack);

  useEffect(() => {
    const el = screenVideoRef.current;
    if (!el) return;

    if (screenSharer && screenSharer.screenTrack) {
      const stream = new MediaStream([screenSharer.screenTrack]);
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(() => {});
      }
    } else {
      el.srcObject = null;
    }
  }, [screenSharer]);

  return (
    <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 bg-slate-950 text-white min-h-0 overflow-hidden relative select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs shrink-0 z-10">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          ) : connectionStatus === 'reconnecting' ? (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          )}

          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'LiveKit Call'}
          </span>

          <span className="text-slate-400 font-mono text-[11px]">
            ⏱️ {formatTime(durationSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 hidden sm:flex items-center gap-1">
            <Lock className="w-3 h-3 text-blue-400" />
            <span>SFU Encrypted</span>
          </span>

          {onToggleFloating && (
            <button
              type="button"
              onClick={onToggleFloating}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title={isFloating ? 'Expand to Modal' : 'Minimize to Floating'}
            >
              {isFloating ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Permission Warning Banner if device was blocked */}
      {permissionError && (
        <div className="mt-2 p-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="flex-1">{permissionError}</span>
        </div>
      )}

      {/* Reconnecting Overlay if temporary network drop */}
      {connectionStatus === 'reconnecting' && (
        <div className="mt-2 p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-center gap-2 shrink-0 animate-pulse">
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <span>Recovering connection to LiveKit Cloud... Please hold.</span>
        </div>
      )}

      {/* Main Content Area: Screen Share Tile + Participant Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
        {/* Screen Share Tile */}
        {screenSharer && (
          <div className="rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500 shadow-2xl flex flex-col min-h-[220px]">
            <div className="px-3 py-1.5 bg-blue-600/90 text-white text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ScreenShare className="w-4 h-4 animate-pulse" />
                <span>🖥️ Screen Share ({screenSharer.name} {screenSharer.isLocal ? '(You)' : ''})</span>
              </span>
              {screenSharer.isLocal && (
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  className="px-2 py-0.5 rounded bg-white text-blue-700 text-[10px] font-extrabold hover:bg-slate-100 transition cursor-pointer"
                >
                  Stop Sharing
                </button>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center p-1 bg-black">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full max-h-[300px] object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Participant Video Grid */}
        <div
          className={`grid gap-3 w-full ${
            participants.length <= 1
              ? 'grid-cols-1 max-w-md mx-auto'
              : participants.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {participants.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs">Connecting media stream...</p>
            </div>
          ) : (
            participants.map(p => (
              <ParticipantVideo
                key={p.participantId || p.identity}
                participant={p}
                isLocal={p.isLocal}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Bottom Controls Bar */}
      <div className="pt-2 shrink-0 z-10">
        <CallControls
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          isScreenSharing={isScreenSharing}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
};
