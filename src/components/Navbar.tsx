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
  Hash,
  Keyboard,
  ShieldCheck,
  Video
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
    userGamification,
    setIsShortcutsModalOpen,
    setIsMcpModalOpen,
    unreadNotificationsCount,
    setIsNotificationCenterOpen,
    setIsTeamRoomOpen,
    activeCall
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
    { id: 'study',      label: 'Board',       icon: LayoutGrid },
    { id: 'tags',       label: 'Tags',        icon: Hash       },
    { id: 'timer',      label: 'Focus',       icon: Timer      },
    { id: 'whiteboard', label: 'White Board', icon: PenTool    },
    { id: 'analytics',  label: 'Analytics',   icon: BarChart3  },
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
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-extrabold text-[11px] shadow-xs tracking-tighter">
              dw
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
              deepwork
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

          {/* Gamification Level & XP pill */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold select-none"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
            title={`${userGamification.levelTitle} • +35 XP per task, +50 XP per focus block`}
          >
            <span className="text-amber-500">⭐ Lvl {userGamification.level}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-blue-600">{userGamification.xp} XP</span>
          </div>

          {/* MCP Server Integration Trigger */}
          <button
            onClick={() => { Haptics.tap(); setIsMcpModalOpen(true); }}
            title="Model Context Protocol (MCP) Integration"
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border"
            style={{
              background: 'rgba(16,185,129,0.08)',
              borderColor: 'rgba(16,185,129,0.25)',
              color: '#10B981'
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold">MCP</span>
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={() => { Haptics.tap(); setIsShortcutsModalOpen(true); }}
            title="Keyboard Shortcuts (Press ?)"
            className="btn-ghost hidden sm:inline-flex"
            style={{ padding: '6px' }}
          >
            <Keyboard className="w-4 h-4" />
          </button>

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
            title={profile.email ? `${profile.email}` : 'Sign in'}
            className="btn-secondary text-xs px-2.5 py-1"
          >
            {profile.googleConnected || profile.email ? (
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

          {/* Live Team Room & Call */}
          <button
            onClick={() => { Haptics.tap(); setIsTeamRoomOpen(true); }}
            title="Encrypted Team Room, Chat & Calls"
            className="btn-ghost relative"
            style={{ padding: '6px' }}
          >
            <Video className={`w-4 h-4 ${activeCall?.active ? 'text-emerald-500' : 'text-slate-400'}`} />
            {activeCall?.active && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          {/* Collaboration Notification Center Bell with Badge */}
          <button
            onClick={() => { Haptics.tap(); setIsNotificationCenterOpen(true); }}
            title="Collaboration notifications & invites"
            className="btn-ghost relative"
            style={{ padding: '6px' }}
          >
            <Bell className={`w-4 h-4 ${unreadNotificationsCount > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
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
