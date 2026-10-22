import React, { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface JoinBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinBoardModal: React.FC<JoinBoardModalProps> = ({ isOpen, onClose }) => {
  const { joinBoardByCode } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setJoining(true);
    setError('');
    const result = await joinBoardByCode(code);
    setJoining(false);
    if (result.success) {
      setCode('');
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl border p-5 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"><KeyRound className="h-5 w-5" /></span>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Join a board</h2>
              <p className="text-xs text-slate-400">Paste the secure join code shared by the board owner.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <input autoFocus value={code} onChange={event => setCode(event.target.value)} placeholder="DW-ABC234~secure-key…" className="input-base w-full font-mono text-sm" />
        <p className="text-[11px] text-slate-500">The secure code includes the board key so the shared board stays end-to-end encrypted. Treat it like a password.</p>
        {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-500">{error}</p>}
        <button disabled={!code.trim() || joining} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50">
          {joining && <Loader2 className="h-4 w-4 animate-spin" />}{joining ? 'Joining…' : 'Join board'}
        </button>
      </form>
    </div>
  );
};
