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

  const fabActions = [
    {
      label: 'Add Study Topic',
      icon: CalendarPlus,
      action: () => openAddTopicModal(),
    },
    {
      label: 'New Subject',
      icon: BookOpen,
      action: () => openCreateSubjectModal(),
    },
    {
      label: 'Focus Timer',
      icon: Timer,
      action: () => setActiveTab('timer'),
    },
    {
      label: 'Streak & Presets',
      icon: Flame,
      action: () => openStreakModal(),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] right-4 z-40 flex flex-col items-end">
      {/* Expanded Quick Actions */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {fabActions.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => handleAction(action)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span>{label}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)' }}
              >
                <Icon className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggle}
        aria-label="Quick Actions"
        className="rounded-xl text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        style={{
          width: '52px',
          height: '52px',
          background: 'var(--accent)',
          boxShadow: '0 4px 14px rgba(180,83,9,0.35)',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
