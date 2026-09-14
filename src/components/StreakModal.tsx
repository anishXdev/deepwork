import React, { useState } from 'react';
import { Flame, Trophy, RotateCcw, ShieldAlert, Sparkles, X, Check, Trash2 } from 'lucide-react';
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
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const handleResetStreak = () => {
    if (window.confirm('Reset your current streak back to 0 days?')) {
      Haptics.warning();
      resetStreak(true); // Preserves longest streak
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md transition-opacity">
      <div 
        className="w-full sm:max-w-md max-sm:rounded-t-3xl sm:rounded-3xl glass-card border border-ocean-200/50 dark:border-ocean-900/60 p-6 shadow-2xl relative max-sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Mobile Pull Handle Pill */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-400/30 rounded-full mx-auto mb-4" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-ocean-800/30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Streak & Preset Controls
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage consistency streaks and starter presets
            </p>
          </div>
        </div>

        {/* Hero Streaks Grid: Current vs Longest */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Current Streak */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center relative overflow-hidden">
            <div className="flex items-center justify-center space-x-1 text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>Current</span>
            </div>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {streaks.currentStreak}
              <span className="text-sm font-sans font-normal ml-1">days</span>
            </div>
          </div>

          {/* Longest Streak Ever */}
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-center relative overflow-hidden">
            <div className="flex items-center justify-center space-x-1 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>Longest</span>
            </div>
            <div className="text-3xl font-black text-teal-600 dark:text-teal-300 font-mono">
              {streaks.longestStreak}
              <span className="text-sm font-sans font-normal ml-1">days</span>
            </div>
          </div>
        </div>

        {/* Manual Streak Adjust / Restore Form */}
        <form onSubmit={handleSaveStreak} className="space-y-4 mb-6">
          <div className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-ocean-950/40 border border-ocean-200/40 dark:border-ocean-900/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-aqua-400" />
                Restore / Set Streak
              </label>
              <span className="text-[11px] text-slate-400">Carry over or recover</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Current Streak (Days)</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={restoreDays}
                  onChange={(e) => setRestoreDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-abyss-card border border-ocean-200 dark:border-ocean-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-aqua-400 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Personal Best (Days)</span>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={longestDays}
                  onChange={(e) => setLongestDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-abyss-card border border-ocean-200 dark:border-ocean-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-aqua-400 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-xl liquid-btn text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {savedSuccess ? 'Updated!' : 'Apply Streak'}
              </button>

              <button
                type="button"
                onClick={handleResetStreak}
                className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Reset current streak to 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset (0d)
              </button>
            </div>
          </div>
        </form>

        {/* Clean Slate / Clear Presets Section */}
        <div className="pt-4 border-t border-ocean-200/40 dark:border-ocean-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Clean Slate Mode
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Clear sample subjects and topics to start with 100% your own custom curriculum.
              </p>
            </div>

            <button
              onClick={handleClearPresets}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                confirmClear
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-ocean-900/70 hover:bg-rose-500/20 hover:text-rose-400 text-slate-700 dark:text-slate-300 border border-ocean-300/40 dark:border-ocean-800/50'
              }`}
            >
              {confirmClear ? 'Confirm Delete All?' : 'Clear Sample Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
