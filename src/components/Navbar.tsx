import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  CalendarDays, 
  BookOpen, 
  Timer, 
  BarChart3, 
  Plus, 
  Flame, 
  Cloud, 
  CloudOff,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    openAddTopicModal, 
    openCreateSubjectModal,
    openStreakModal,
    streaks, 
    profile, 
    setIsSyncModalOpen,
    cloudSyncStatus,
    syncKey,
    settings,
    toggleTheme,
    isTimerRunning,
    timeLeft,
    timerMode
  } = useApp();

  const isDark = settings.theme === 'dark';

  const formatTimerShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'study', label: 'Study', icon: CalendarDays },
    { id: 'subjects', label: 'Curriculum', icon: BookOpen },
    { id: 'timer', label: 'Focus', icon: Timer },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel px-3 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Name (Minimalist) */}
        <div 
          onClick={() => {
            Haptics.tap();
            setActiveTab('study');
          }}
          className="flex items-center space-x-2 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-ocean-600 to-aqua-400 flex items-center justify-center shadow-md shadow-ocean-500/20 group-hover:scale-105 transition-transform">
            <span className="text-white text-sm">🌊</span>
          </div>
          <span className="font-bold tracking-tight text-sm sm:text-base font-sans flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            StudyPulse
          </span>
        </div>

        {/* Desktop Navigation Tabs (Clean & Symbol-focused) */}
        <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-slate-200/60 dark:bg-abyss-900/60 border border-ocean-200/40 dark:border-ocean-900/50">
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
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm shadow-ocean-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-ocean-700 dark:hover:text-aqua-300 hover:bg-ocean-500/10'
                }`}
                title={item.label}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Actions, Streak, Theme Toggle & Sync */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Active Focus Mini-Timer Pill (shown when running and navigating away from Focus tab) */}
          {activeTab !== 'timer' && isTimerRunning && (
            <button
              onClick={() => {
                Haptics.tap();
                setActiveTab('timer');
              }}
              title="Focus timer is running! Click to jump to Focus vessel"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/50 text-teal-600 dark:text-teal-300 text-xs font-mono font-bold animate-pulse hover:bg-teal-500/30 transition-all cursor-pointer shadow-md shadow-teal-500/20 active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <span>{formatTimerShort(timeLeft)}</span>
            </button>
          )}

          {/* Clickable Streak Badge with Fire Symbol & Longest Badge */}
          <button 
            onClick={() => {
              Haptics.tap();
              openStreakModal();
            }}
            title={`Current Streak: ${streaks.currentStreak}d • Longest: ${streaks.longestStreak}d (Click to manage/restore)`}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs font-bold transition-transform active:scale-95 cursor-pointer select-none"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span className="font-mono">{streaks.currentStreak}d</span>
            {streaks.longestStreak > 0 && (
              <span className="hidden sm:inline-block text-[10px] text-amber-600/80 dark:text-amber-300/80 font-normal pl-1 border-l border-amber-500/30">
                🏆 {streaks.longestStreak}d
              </span>
            )}
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => {
              Haptics.tap();
              toggleTheme();
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-xl border border-ocean-200/50 dark:border-ocean-900/60 bg-white/80 dark:bg-abyss-card/80 text-slate-700 dark:text-slate-300 hover:text-ocean-600 dark:hover:text-aqua-400 transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Cloud Sync Status Icon */}
          <button
            onClick={() => {
              Haptics.tap();
              setIsSyncModalOpen(true);
            }}
            title={
              cloudSyncStatus === 'syncing'
                ? 'Syncing across devices...'
                : profile.googleConnected
                ? `Google Synced: ${profile.email}`
                : `Cloud Sync (${syncKey}) - Click to configure`
            }
            className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 ${
              cloudSyncStatus === 'syncing'
                ? 'bg-aqua-500/20 border-aqua-400/50 text-aqua-400 animate-pulse'
                : profile.googleConnected || cloudSyncStatus === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                : 'bg-white/80 dark:bg-abyss-card/80 border-ocean-200/50 dark:border-ocean-900/60 text-slate-500 hover:text-ocean-600 dark:hover:text-aqua-300'
            }`}
          >
            {cloudSyncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-aqua-400 animate-spin" />
            ) : profile.googleConnected || cloudSyncStatus === 'synced' ? (
              <Cloud className="w-4 h-4 text-emerald-500" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
          </button>

          {/* Quick Add Subject Symbol Button */}
          <button
            onClick={() => {
              Haptics.tap();
              openCreateSubjectModal();
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-200/80 dark:bg-abyss-card/80 hover:bg-ocean-500/10 dark:hover:bg-ocean-950/50 text-slate-700 dark:text-slate-300 text-xs font-medium border border-ocean-200/50 dark:border-ocean-900/60 transition-colors flex items-center space-x-1"
            title="Add Subject"
          >
            <BookOpen className="w-3.5 h-3.5 text-ocean-600 dark:text-aqua-400" />
            <span className="hidden lg:inline">+ Subject</span>
          </button>

          {/* Quick Add Topic Button (Liquid 3D button) */}
          <button
            onClick={() => {
              Haptics.tap();
              openAddTopicModal();
            }}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95"
            title="Add Topic"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Topic</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar with Safe-Area Inset & Tactile Active States */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-ocean-200/40 dark:border-ocean-900/60 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] px-3 flex justify-around shadow-2xl backdrop-blur-2xl">
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
              <span>{item.id === 'timer' && isTimerRunning && activeTab !== 'timer' ? formatTimerShort(timeLeft) : item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

