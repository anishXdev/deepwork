import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Key, ArrowRight, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const JoinBoardModal: React.FC = () => {
  const { isJoinBoardModalOpen, setIsJoinBoardModalOpen, joinBoardByCode } = useApp();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isJoinBoardModalOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setErrorMessage('');
    Haptics.tap();

    // Extract code if user pasted a full URL (e.g. https://.../?code=DW-XXXX or ?joinCode=DW-XXXX)
    let extractedCode = trimmed;
    try {
      if (trimmed.includes('http') || trimmed.includes('?')) {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com/${trimmed}`);
        extractedCode = url.searchParams.get('joinCode') || url.searchParams.get('code') || url.searchParams.get('joinBoard') || trimmed;
      }
    } catch {}

    const res = await joinBoardByCode(extractedCode);
    setIsLoading(false);

    if (res.success) {
      setIsJoinBoardModalOpen(false);
      setCode('');
      setErrorMessage('');
    } else {
      setErrorMessage(res.message);
      Haptics.warning();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl border animate-in zoom-in-95 duration-150"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Join Board with Invite Code
              </h3>
              <p className="text-[11px] text-slate-400">
                Collaborate on your team's workspace instantly
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsJoinBoardModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Enter 6-character Code or Invite Link
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. DW-DEFAULT or DW-8M2P4X"
                value={code}
                onChange={e => {
                  setCode(e.target.value.toUpperCase());
                  setErrorMessage('');
                }}
                className="input-base text-sm font-mono tracking-wider uppercase py-2.5 px-3 w-full"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Ask the board owner for their code in the Collaborators menu.</span>
            </p>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl flex items-center gap-2 text-xs bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsJoinBoardModalOpen(false)}
              className="btn-secondary text-xs px-3 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Join Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
