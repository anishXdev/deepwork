import React from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, BookOpen, Timer, BarChart3 } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isTimerRunning, timeLeft } = useApp();

  const navItems = [
    { id: 'study', label: 'Study', icon: CalendarDays },
    { id: 'subjects', label: 'Curriculum', icon: BookOpen },
    { id: 'timer', label: 'Focus', icon: Timer },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  const formatTimerShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-ocean-200/50 dark:border-ocean-900/70 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] px-3 flex justify-around shadow-2xl backdrop-blur-2xl bg-white/90 dark:bg-[#030d17]/95"
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              Haptics.tap();
              setActiveTab(item.id);
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-2xl text-[11px] font-medium transition-all active:scale-90 ${
              isActive
                ? 'bg-gradient-to-r from-ocean-500/20 to-aqua-500/20 text-ocean-600 dark:text-aqua-300 font-bold border border-aqua-400/30 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-aqua-500 dark:text-aqua-300 scale-110' : ''}`} />
              {item.id === 'timer' && isTimerRunning && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              )}
            </div>
            <span>
              {item.id === 'timer' && isTimerRunning && activeTab !== 'timer' 
                ? formatTimerShort(timeLeft) 
                : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
