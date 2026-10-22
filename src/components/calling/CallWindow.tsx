import React, { useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Wifi } from 'lucide-react';
import { RealtimeCollab } from '../../services/realtimeCall';
import { CallControls } from './CallControls';
import { CollabCallParticipant } from '../../types';

interface CallWindowProps {
  roomName: string;
  durationSeconds: number;
  remoteMediaStreams: Record<string, MediaStream>;
  participants: CollabCallParticipant[];
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  isFloating?: boolean;
  onToggleFloating?: () => void;
}

const RemotePeerTile: React.FC<{ name: string; stream: MediaStream }> = ({ name, stream }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasVideo = stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live');
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
      if (audioRef.current) audioRef.current.srcObject = null;
    };
  }, [stream]);
  return <div className="relative min-h-[160px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
    {hasVideo ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div className="text-sm text-slate-300">{name} joined with camera off</div>}
    <audio ref={audioRef} autoPlay playsInline />
    <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs">{name}</span>
  </div>;
};

export const CallWindow: React.FC<CallWindowProps> = ({
  roomName, durationSeconds, remoteMediaStreams, participants, isMuted, isVideoOn, isScreenSharing,
  onToggleMute, onToggleVideo, onToggleScreenShare, onEndCall, isFloating = false, onToggleFloating
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStream = RealtimeCollab.getLocalStream();
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some(track => track.enabled && track.readyState === 'live'));

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    return () => { if (localVideoRef.current) localVideoRef.current.srcObject = null; };
  }, [localStream]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const peers = Object.entries(remoteMediaStreams);
  const peerName = (email: string) => participants.find(p => (p as any).email?.toLowerCase() === email.toLowerCase())?.name || email || roomName || 'Teammate';

  return <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 bg-slate-950 text-white min-h-0 overflow-hidden relative select-none">
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs shrink-0">
      <div className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="font-bold uppercase tracking-wider text-[11px]">Peer to peer WebRTC · {participants.length + 1} in call</span><span className="text-slate-400 font-mono text-[11px]">⏱️ {formatTime(durationSeconds)}</span></div>
      {onToggleFloating && <button type="button" onClick={onToggleFloating} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" title={isFloating ? 'Expand call' : 'Minimize call'}>{isFloating ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}</button>}
    </div>
    <div className={`flex-1 min-h-0 grid gap-3 py-3 overflow-y-auto ${peers.length > 1 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      <div className="relative min-h-[160px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
        {hasLocalVideo ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" /> : <div className="text-sm text-slate-300">Your camera is off</div>}
        <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs">You</span>
      </div>
      {peers.map(([email, stream]) => <RemotePeerTile key={email} name={peerName(email)} stream={stream} />)}
      {!peers.length && <div className="min-h-[160px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm text-slate-400">Waiting for teammates to join…</div>}
    </div>
    <div className="pt-2 shrink-0"><CallControls isMuted={isMuted} isVideoOn={isVideoOn} isScreenSharing={isScreenSharing} onToggleMute={onToggleMute} onToggleVideo={onToggleVideo} onToggleScreenShare={onToggleScreenShare} onEndCall={onEndCall} /></div>
  </div>;
};
