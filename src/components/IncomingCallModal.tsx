import React from 'react';
import { useApp } from '../context/AppContext';
import { Video, Phone, PhoneOff, ShieldCheck, User } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useApp();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-sm rounded-3xl p-6 sm:p-7 flex flex-col items-center text-center relative shadow-2xl border overflow-hidden animate-in zoom-in-95"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Animated Radar Pulse behind avatar */}
        <div className="relative my-4">
          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping scale-150" />
          <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse scale-125" />

          {incomingCall.callerAvatar ? (
            <img
              src={incomingCall.callerAvatar}
              alt={incomingCall.callerName}
              className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-xl relative z-10"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-xl relative z-10"
              style={{ backgroundColor: incomingCall.callerColor || '#0C66E4' }}
            >
              {incomingCall.callerName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
            {incomingCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Call Info */}
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Incoming {incomingCall.type === 'video' ? 'Video' : 'Audio'} Call...</span>
          </div>

          <h3 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            {incomingCall.callerName}
          </h3>

          <p className="text-xs text-slate-400 font-medium">
            Workspace: <strong className="text-slate-300">"{incomingCall.boardName}"</strong>
          </p>

          <div className="pt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Peer-to-peer encrypted call</span>
          </div>
        </div>

        {/* Two Actions: Accept vs Reject */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          {/* Reject button */}
          <button
            type="button"
            onClick={() => {
              Haptics.tap();
              rejectIncomingCall();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          {/* Accept button */}
          <button
            type="button"
            onClick={() => {
              Haptics.success();
              acceptIncomingCall();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            {incomingCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
