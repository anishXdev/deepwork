import React, { useState } from 'react';
import { Plus, BookOpen, CalendarPlus, Timer, Flame, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Haptics } from '../utils/haptics';

export const MobileFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { openAddTopicModal, openCreateSubjectModal, setActiveTab, openStreakModal } = useApp();

  const toggle = () => {
    Haptics.tap();
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    Haptics.tap();
    setIsOpen(false);
    action();
  };

  return (
    <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] right-4 z-40 flex flex-col items-end">
      {/* Expanded Quick Action Items */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Quick Add Topic */}
          <button
            onClick={() => handleAction(() => openAddTopicModal())}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-card border border-aqua-400/40 shadow-xl text-slate-800 dark:text-slate-100 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span>Add Study Topic</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
          </button>

          {/* Quick Add Subject */}
          <button
            onClick={() => handleAction(() => openCreateSubjectModal())}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-card border border-aqua-400/40 shadow-xl text-slate-800 dark:text-slate-100 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span>New Subject</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </button>

          {/* Quick Launch Pomodoro */}
          <button
            onClick={() => handleAction(() => setActiveTab('timer'))}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-card border border-aqua-400/40 shadow-xl text-slate-800 dark:text-slate-100 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span>Focus Timer</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </button>

          {/* Manage Streak */}
          <button
            onClick={() => handleAction(() => openStreakModal())}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-card border border-aqua-400/40 shadow-xl text-slate-800 dark:text-slate-100 text-xs font-semibold active:scale-95 transition-transform"
          >
            <span>Streak & Presets</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-orange-400" />
            </div>
          </button>
        </div>
      )}

      {/* Main FAB Trigger */}
      <button
        onClick={toggle}
        aria-label="Quick Actions"
        className={`w-13 h-13 rounded-2xl liquid-btn text-white flex items-center justify-center shadow-xl shadow-aqua-500/30 active:scale-90 transition-all ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        style={{ width: '52px', height: '52px' }}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
