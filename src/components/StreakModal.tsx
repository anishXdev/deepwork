import React, { useState } from 'react';
import { Flame, Trophy, RotateCcw, Sparkles, X, Check, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Haptics } from '../utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StreakModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { streaks, setManualStreak, resetStreak, clearAllPresetData } = useApp();
  const [restoreDays, setRestoreDays] = useState<number>(streaks.currentStreak || 1);
  const [longestDays, setLongestDays] = useState<number>(streaks.longestStreak || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleSaveStreak = (e: React.FormEvent) => {
    e.preventDefault();
    Haptics.success();
    setManualStreak(restoreDays, Math.max(longestDays, restoreDays));
    setSavedSuccess(true);
    setTimeout(() => { setSavedSuccess(false); }, 2000);
  };

  const handleResetStreak = () => {
    if (window.confirm('Reset your current streak back to 0 days?')) {
      Haptics.warning();
      resetStreak(true);
      setRestoreDays(0);
    }
  };

  const handleClearPresets = () => {
    if (confirmClear) {
      Haptics.warning();
      clearAllPresetData();
      setConfirmClear(false);
      onClose();
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-md max-sm:rounded-t-2xl sm:rounded-2xl p-6 relative max-sm:max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Mobile pull handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mb-4" style={{ background: 'var(--border)' }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'var(--accent)' }}>
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}>
              Streak & Preset Controls
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage consistency streaks and starter presets</p>
          </div>
        </div>

        {/* Streak Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#f59e0b' }}>
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>Current</span>
            </div>
            <div className="text-3xl font-black font-mono" style={{ color: '#d97706' }}>
              {streaks.currentStreak}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>days</span>
            </div>
          </div>

          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.2)' }}>
            <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
              <Trophy className="w-3.5 h-3.5" />
              <span>Longest</span>
            </div>
            <div className="text-3xl font-black font-mono" style={{ color: 'var(--accent)' }}>
              {streaks.longestStreak}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-muted)' }}>days</span>
            </div>
          </div>
        </div>

        {/* Manual Streak Adjust */}
        <form onSubmit={handleSaveStreak} className="mb-6">
          <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                Restore / Set Streak
              </label>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Carry over or recover</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Current Streak (Days)</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={restoreDays}
                  onChange={e => setRestoreDays(parseInt(e.target.value) || 0)}
                  className="input-base w-full font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Personal Best (Days)</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={longestDays}
                  onChange={e => setLongestDays(parseInt(e.target.value) || 0)}
                  className="input-base w-full font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {savedSuccess ? 'Updated!' : 'Apply Streak'}
              </button>

              <button
                type="button"
                onClick={handleResetStreak}
                className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                title="Reset current streak to 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset (0d)
              </button>
            </div>
          </div>
        </form>

        {/* Clear Presets */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                Clean Slate Mode
              </h4>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                Clear sample subjects and topics to start with 100% your own custom curriculum.
              </p>
            </div>

            <button
              onClick={handleClearPresets}
              className="px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0"
              style={{
                background: confirmClear ? '#ef4444' : 'var(--bg-card-alt)',
                color: confirmClear ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${confirmClear ? '#ef4444' : 'var(--border)'}`,
              }}
            >
              {confirmClear ? 'Confirm Delete All?' : 'Clear Sample Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
