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
  RefreshCw,
  LogIn,
  UserCheck,
  Bell
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { DStudyLogo } from './DStudyLogo';
import { Notifications } from '../services/notifications';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    openAddTopicModal, 
    openCreateSubjectModal,
    openStreakModal,
    openAuthModal,
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
  const [notifPerm, setNotifPerm] = React.useState<'granted' | 'denied' | 'default' | 'unsupported'>(() => Notifications.getPermission());

  const handleToggleNotifications = async () => {
    Haptics.tap();
    const perm = await Notifications.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      Notifications.toast('info', '🔔 Notifications enabled for sessions, breaks & streaks!');
    } else if (perm === 'denied') {
      Notifications.toast('warning', '⚠️ Notifications blocked by browser.');
    }
  };

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
        
        {/* Brand Logo & Name (dstudy) */}
        <div 
          onClick={() => {
            Haptics.tap();
            setActiveTab('study');
          }}
          className="flex items-center cursor-pointer group select-none"
        >
          <DStudyLogo size={28} showText={true} />
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

          {/* Sign In / Account Pill */}
          <button
            onClick={() => {
              Haptics.tap();
              openAuthModal();
            }}
            title={profile.googleConnected ? `Signed in as ${profile.email}` : "Sign In / Sign Up with Google"}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              profile.googleConnected
                ? 'bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-600 dark:text-teal-300'
                : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-sm'
            }`}
          >
            {profile.googleConnected ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline font-sans truncate max-w-[80px]">{profile.name?.split(' ')[0] || 'Account'}</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-slate-800" />
                <span className="font-sans">Sign In</span>
              </>
            )}
          </button>

          {/* Browser Notifications Bell Toggle */}
          <button
            onClick={handleToggleNotifications}
            title={
              notifPerm === 'granted'
                ? 'Notifications enabled (Alerts for completed sessions & breaks)'
                : notifPerm === 'denied'
                ? 'Notifications blocked by browser. Click to retry.'
                : 'Click to enable study & break alerts'
            }
            className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 relative ${
              notifPerm === 'granted'
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-500 dark:text-teal-300'
                : 'border-ocean-200/50 dark:border-ocean-900/60 bg-white/80 dark:bg-abyss-card/80 text-slate-500 dark:text-slate-400 hover:text-teal-500'
            }`}
          >
            <Bell className="w-4 h-4" />
            {notifPerm === 'granted' && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm" />
            )}
            {notifPerm === 'denied' && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" />
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

          {/* Quick Add Subject Symbol Button (Desktop/Tablet) */}
          <button
            onClick={() => {
              Haptics.tap();
              openCreateSubjectModal();
            }}
            className="hidden sm:flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-200/80 dark:bg-abyss-card/80 hover:bg-ocean-500/10 dark:hover:bg-ocean-950/50 text-slate-700 dark:text-slate-300 text-xs font-medium border border-ocean-200/50 dark:border-ocean-900/60 transition-colors"
            title="Add Subject"
          >
            <BookOpen className="w-3.5 h-3.5 text-ocean-600 dark:text-aqua-400" />
            <span className="hidden lg:inline">+ Subject</span>
          </button>

          {/* Quick Add Topic Button (Desktop/Tablet) */}
          <button
            onClick={() => {
              Haptics.tap();
              openAddTopicModal();
            }}
            className="hidden sm:flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95"
            title="Add Topic"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Topic</span>
          </button>
        </div>
      </div>
    </header>
  );
};

