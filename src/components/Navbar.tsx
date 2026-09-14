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
  Moon
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    openAddTopicModal, 
    openCreateSubjectModal,
    streaks, 
    profile, 
    setIsSyncModalOpen,
    settings,
    toggleTheme
  } = useApp();

  const isDark = settings.theme === 'dark';

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
          onClick={() => setActiveTab('study')}
          className="flex items-center space-x-2 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-sm sm:text-base font-sans flex items-center gap-1.5">
            StudyPulse
          </span>
        </div>

        {/* Desktop Navigation Tabs (Clean & Symbol-focused) */}
        <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/40 dark:hover:bg-slate-800/60'
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
          
          {/* Streak Badge with Fire Symbol */}
          <div 
            title={`Streak: ${streaks.currentStreak} days`}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-xs font-bold"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span className="font-mono">{streaks.currentStreak}d</span>
          </div>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-300/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Google Sync Status Icon */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            title={profile.googleConnected ? `Synced: ${profile.email}` : 'Google Calendar & Sync'}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
              profile.googleConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-300/80 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {profile.googleConnected ? (
              <Cloud className="w-4 h-4 text-emerald-500" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
          </button>

          {/* Quick Add Subject Symbol Button */}
          <button
            onClick={() => openCreateSubjectModal()}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors flex items-center space-x-1"
            title="Add Subject"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden lg:inline">+ Subject</span>
          </button>

          {/* Quick Add Topic Button */}
          <button
            onClick={() => openAddTopicModal()}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            title="Add Topic"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Topic</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel py-2 px-3 flex justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
