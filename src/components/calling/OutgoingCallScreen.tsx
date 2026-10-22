import React from 'react';
import { PhoneOff, PhoneCall, ShieldCheck } from 'lucide-react';
import { OutgoingCallState } from '../../types';

interface OutgoingCallScreenProps {
  outgoingCall: OutgoingCallState;
  onCancelCall: () => void;
}

export const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({
  outgoingCall,
  onCancelCall
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayName = outgoingCall.targetNames.join(', ') || 'Teammate';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white relative bg-slate-950 animate-in fade-in select-none">
      {/* Animated radar pulse rings */}
      <div className="relative my-6 flex items-center justify-center">
        <span className="absolute w-44 h-44 rounded-full bg-blue-500/15 animate-ping duration-1000" />
        <span className="absolute w-32 h-32 rounded-full bg-blue-500/25 animate-pulse" />
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl relative z-10 border-4 border-blue-400/40">
          {initials}
        </div>
        <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg animate-bounce">
          <PhoneCall className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2 mb-8 max-w-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Ringing Teammate • {formatTime(outgoingCall.ringingSeconds)}</span>
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight">
          {displayName}
        </h3>

        <p className="text-xs text-slate-400 font-medium">
          Workspace: <strong className="text-slate-200">"{outgoingCall.boardName}"</strong>
        </p>

        <div className="pt-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Peer to peer WebRTC voice & video</span>
        </div>

        <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
          Waiting for collaborator to answer. Audio & video stream will launch automatically upon acceptance.
        </p>
      </div>

      {/* Cancel Calling Button */}
      <button
        type="button"
        onClick={onCancelCall}
        className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-xl shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
        title="Cancel Outgoing Call"
      >
        <PhoneOff className="w-4 h-4" />
        <span>Cancel Call</span>
      </button>
    </div>
  );
};
