import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, X, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#0d9488', // Ocean Teal
  '#06b6d4', // Aqua Cyan
  '#14b8a6', // Turquoise
  '#0ea5e9', // Sky Flow
  '#10b981', // Emerald Wave
  '#f59e0b', // Sun Gold
  '#f43f5e', // Coral Reef
  '#8b5cf6', // Deep Violet
];

export const CreateSubjectModal: React.FC = () => {
  const { isCreateSubjectModalOpen, closeCreateSubjectModal, addSubject } = useApp();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(5);

  if (!isCreateSubjectModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSubject(name.trim(), color, weeklyTargetHours);
    setName('');
    closeCreateSubjectModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="glass-panel w-full max-w-md rounded-2xl border border-ocean-200/50 dark:border-ocean-900/60 shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ocean-200/50 dark:border-ocean-900/50 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-ocean-500/10 text-ocean-600 dark:text-aqua-400 border border-ocean-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Subject</h2>
              <p className="text-xs text-ocean-700/80 dark:text-ocean-300/70">Create a study domain</p>
            </div>
          </div>

          <button
            onClick={closeCreateSubjectModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-ocean-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Subject Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Distributed Systems, Organic Chemistry..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-ocean-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Weekly Target (Hours)
            </label>
            <input
              type="number"
              min="0.5"
              max="80"
              step="0.5"
              value={weeklyTargetHours}
              onChange={e => setWeeklyTargetHours(parseFloat(e.target.value) || 1)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-ocean-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Color Tag
            </label>
            <div className="flex items-center space-x-2.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    color === c ? 'scale-125 ring-2 ring-ocean-500 ring-offset-2 dark:ring-offset-abyss-950' : 'hover:scale-110 opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={closeCreateSubjectModal}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95"
            >
              Create Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
