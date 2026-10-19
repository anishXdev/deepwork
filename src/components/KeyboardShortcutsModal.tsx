import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Keyboard, X, Zap, Command } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const KeyboardShortcutsModal: React.FC = () => {
  const {
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    setActiveTab,
    isTimerRunning,
    startTimer,
    pauseTimer,
    openAddTopicModal,
    ambientSoundType,
    setAmbientSoundType,
  } = useApp();

  // Global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape closes modal
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
      }

      // '?' toggles shortcuts HUD
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        Haptics.tap();
        setIsShortcutsModalOpen(!isShortcutsModalOpen);
        return;
      }

      if (isInput) return;
      // Never intercept browser or OS commands (Cmd+C, Ctrl+C, Cmd+V, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Space: Start/Pause Focus Timer
      if (e.code === 'Space') {
        e.preventDefault();
        Haptics.tap();
        if (isTimerRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
        return;
      }

      // 'n': Quick Create Task (c shortcut removed per user request)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        Haptics.tap();
        const todayStr = new Date().toISOString().split('T')[0];
        openAddTopicModal(todayStr);
        return;
      }

      // Tab navigation numbers: 1 to 5
      if (e.key === '1') {
        e.preventDefault();
        Haptics.tap();
        setActiveTab('study');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        Haptics.tap();
        setActiveTab('timer');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        Haptics.tap();
        setActiveTab('whiteboard');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        Haptics.tap();
        setActiveTab('analytics');
        return;
      }
      if (e.key === '5') {
        e.preventDefault();
        Haptics.tap();
        setActiveTab('tags');
        return;
      }

      // 'm': Toggle Ambient sound
      if (e.key === 'm') {
        e.preventDefault();
        Haptics.tap();
        setAmbientSoundType(ambientSoundType === 'none' ? 'ocean' : 'none');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    setActiveTab,
    isTimerRunning,
    startTimer,
    pauseTimer,
    openAddTopicModal,
    ambientSoundType,
    setAmbientSoundType,
  ]);

  if (!isShortcutsModalOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Start / Pause Focus Timer', badge: 'Global' },
    { key: 'n', desc: 'Quick create task / card', badge: 'Action' },
    { key: '1', desc: 'Jump to Kanban Board', badge: 'Nav' },
    { key: '2', desc: 'Jump to Focus Timer', badge: 'Nav' },
    { key: '3', desc: 'Jump to Offline Whiteboard', badge: 'Nav' },
    { key: '4', desc: 'Jump to Time Analytics', badge: 'Nav' },
    { key: '5', desc: 'Jump to Tags & Projects', badge: 'Nav' },
    { key: 'm', desc: 'Toggle Ambient Audio Mute / Sound', badge: 'Audio' },
    { key: '?', desc: 'Toggle this Shortcuts Guide', badge: 'Help' },
    { key: 'Esc', desc: 'Close dialogs & popups', badge: 'Global' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Power Shortcuts
              </h3>
              <p className="text-[10px] text-slate-400">
                Work at the speed of thought without taking your hands off the keyboard
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {shortcuts.map(s => (
            <div
              key={s.key}
              className="p-2 rounded-xl flex items-center justify-between gap-2"
              style={{
                background: 'var(--bg-card-alt)',
                border: '1px solid var(--border)'
              }}
            >
              <div className="flex items-center gap-2">
                <kbd
                  className="px-2 py-0.5 rounded-md font-mono text-xs font-bold shadow-xs"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {s.key}
                </kbd>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {s.desc}
                </span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-400 bg-slate-200 dark:bg-slate-700">
                {s.badge}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t text-[11px] text-slate-400" style={{ borderColor: 'var(--border)' }}>
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">?</kbd> anytime to toggle</span>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="btn-primary text-xs px-3 py-1 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
