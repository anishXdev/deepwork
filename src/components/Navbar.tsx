import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutGrid,
  BookOpen,
  Timer,
  BarChart3,
  Flame,
  Cloud,
  CloudOff,
  Sun,
  Moon,
  RefreshCw,
  LogIn,
  UserCheck,
  Bell,
  BellOff,
  PenTool,
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { DStudyLogo } from './DStudyLogo';
import { Notifications } from '../services/notifications';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
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
  } = useApp();

  const isDark = settings.theme === 'dark';
  const [notifPerm, setNotifPerm] = React.useState<'granted' | 'denied' | 'default' | 'unsupported'>(
    () => Notifications.getPermission()
  );

  const handleToggleNotifications = async () => {
    Haptics.tap();
    const perm = await Notifications.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      Notifications.toast('info', '🔔 Notifications enabled!');
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
    { id: 'study',      label: 'Board',      icon: LayoutGrid },
    { id: 'subjects',   label: 'Subjects',   icon: BookOpen   },
    { id: 'timer',      label: 'Focus',      icon: Timer      },
    { id: 'whiteboard', label: 'Whiteboard', icon: PenTool    },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3  },
  ] as const;

  return (
    <header
      style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%',
      }}
    >
      <div
        className="max-w-[1500px] mx-auto px-4 sm:px-6"
        style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* ── Brand ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => { Haptics.tap(); setActiveTab('study'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              d
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              dstudy
            </span>
          </button>

          {/* ── Desktop Navigation Tabs ───────────────── */}
          <nav
            className="hidden md:flex items-center gap-1"
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { Haptics.tap(); setActiveTab(item.id); }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {item.id === 'timer' && isTimerRunning && !isActive
                      ? formatTimerShort(timeLeft)
                      : item.label}
                  </span>
                  {item.id === 'timer' && isTimerRunning && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Right Controls ──────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

          {/* Streak badge */}
          <button
            onClick={() => { Haptics.tap(); openStreakModal(); }}
            title={`Streak: ${streaks.currentStreak} days`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
            style={{
              background: streaks.currentStreak > 0 ? 'var(--warn-bg)' : 'var(--bg-subtle)',
              border: `1px solid ${streaks.currentStreak > 0 ? 'var(--warn-border)' : 'var(--border)'}`,
              color: streaks.currentStreak > 0 ? 'var(--warn)' : 'var(--text-muted)',
            }}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span className="font-mono">{streaks.currentStreak}d</span>
          </button>

          {/* Sign In / Account */}
          <button
            onClick={() => { Haptics.tap(); openAuthModal(); }}
            title={profile.googleConnected ? `${profile.email}` : 'Sign in'}
            className="btn-secondary text-xs px-2.5 py-1"
          >
            {profile.googleConnected ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">
                  {profile.name?.split(' ')[0] || 'Account'}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </>
            )}
          </button>

          {/* Notification bell */}
          <button
            onClick={handleToggleNotifications}
            title={notifPerm === 'granted' ? 'Notifications on' : 'Enable notifications'}
            className="btn-ghost"
            style={{ padding: '6px' }}
          >
            {notifPerm === 'granted'
              ? <Bell className="w-4 h-4 text-blue-600" />
              : <BellOff className="w-4 h-4" />
            }
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => { Haptics.tap(); toggleTheme(); }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="btn-ghost"
            style={{ padding: '6px' }}
          >
            {isDark
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          {/* Cloud sync */}
          <button
            onClick={() => { Haptics.tap(); setIsSyncModalOpen(true); }}
            title={
              cloudSyncStatus === 'syncing'
                ? 'Syncing…'
                : profile.googleConnected
                ? `Synced: ${profile.email}`
                : `Sync (${syncKey})`
            }
            className="btn-ghost"
            style={{
              padding: '6px',
              color: cloudSyncStatus === 'syncing' || profile.googleConnected || cloudSyncStatus === 'synced'
                ? 'var(--success)'
                : 'var(--text-muted)',
            }}
          >
            {cloudSyncStatus === 'syncing'
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : profile.googleConnected || cloudSyncStatus === 'synced'
              ? <Cloud className="w-4 h-4" />
              : <CloudOff className="w-4 h-4" />
            }
          </button>

        </div>
      </div>
    </header>
  );
};
