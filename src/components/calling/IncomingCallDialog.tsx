import React from 'react';
import { Video, Phone, PhoneOff, ShieldCheck } from 'lucide-react';
import { IncomingCall } from '../../types';
import { Haptics } from '../../utils/haptics';

interface IncomingCallDialogProps {
  incomingCall: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  incomingCall,
  onAccept,
  onReject
}) => {
  return (
    <aside
      aria-label="Incoming Call Alert"
      className="fixed top-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl p-5 sm:p-6 flex flex-col items-center text-center shadow-2xl border overflow-hidden animate-in slide-in-from-top-4 duration-200"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(16, 185, 129, 0.25)'
      }}
    >
      {/* Animated Radar Pulse behind avatar */}
      <div className="relative my-3 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping scale-150 duration-1000" />
        <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse scale-125" />

        {incomingCall.callerAvatar ? (
          <img
            src={incomingCall.callerAvatar}
            alt={incomingCall.callerName}
            className="w-18 h-18 rounded-full object-cover border-4 border-emerald-500 shadow-xl relative z-10"
          />
        ) : (
          <div
            className="w-18 h-18 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-xl relative z-10"
            style={{ backgroundColor: incomingCall.callerColor || '#0C66E4' }}
          >
            {incomingCall.callerName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
          {incomingCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Call Info */}
      <div className="space-y-1 mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Incoming {incomingCall.type === 'video' ? 'Video' : 'Audio'} Call...</span>
        </div>

        <h3 className="text-xl font-extrabold tracking-tight pt-1" style={{ color: 'var(--text-primary)' }}>
          {incomingCall.callerName}
        </h3>

        <p className="text-xs text-slate-400 font-medium">
          Workspace: <strong className="text-slate-300">"{incomingCall.boardName}"</strong>
        </p>

        <div className="pt-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Peer to peer WebRTC call</span>
        </div>
      </div>

      {/* Two Actions: Accept vs Decline */}
      <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
        {/* Decline button */}
        <button
          type="button"
          onClick={() => {
            Haptics.tap();
            onReject();
          }}
          className="w-full py-3 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Decline</span>
        </button>

        {/* Accept button */}
        <button
          type="button"
          onClick={() => {
            Haptics.success();
            onAccept();
          }}
          className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        >
          {incomingCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          <span>Accept Call</span>
        </button>
      </div>
    </aside>
  );
};
