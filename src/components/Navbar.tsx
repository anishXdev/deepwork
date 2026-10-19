import React from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarDays,
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
    { id: 'study',     label: 'Today',      icon: CalendarDays },
    { id: 'subjects',  label: 'Subjects',   icon: BookOpen     },
    { id: 'timer',     label: 'Focus',      icon: Timer        },
    { id: 'analytics', label: 'Analytics',  icon: BarChart3    },
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
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 1.25rem',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* ── Brand ──────────────────────────────────── */}
        <button
          onClick={() => { Haptics.tap(); setActiveTab('study'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem 0',
            flexShrink: 0,
          }}
        >
          <DStudyLogo size={22} showText={true} />
        </button>

        {/* ── Desktop Nav ─────────────────────────────── */}
        <nav
          className="hidden md:flex"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '2px',
            padding: '3px',
            background: 'var(--bg-card-alt)',
            border: '1px solid var(--border)',
            borderRadius: '9px',
          }}
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className="nav-tab"
                style={isActive ? {
                  background: 'var(--text-primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 600,
                } : {}}
                onClick={() => { Haptics.tap(); setActiveTab(item.id); }}
              >
                <Icon
                  style={{
                    width: '14px',
                    height: '14px',
                    flexShrink: 0,
                    ...(item.id === 'timer' && isTimerRunning && !isActive ? {
                      color: 'var(--accent)',
                    } : {}),
                  }}
                />
                <span>
                  {item.id === 'timer' && isTimerRunning && !isActive
                    ? formatTimerShort(timeLeft)
                    : item.label}
                </span>
                {item.id === 'timer' && isTimerRunning && !isActive && (
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                      animation: 'pulseSoft 1.5s ease-in-out infinite',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right Controls ──────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

          {/* Streak badge */}
          <button
            onClick={() => { Haptics.tap(); openStreakModal(); }}
            title={`Streak: ${streaks.currentStreak} days`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: streaks.currentStreak > 0 ? 'rgba(180,83,9,0.08)' : 'var(--bg-card-alt)',
              border: `1px solid ${streaks.currentStreak > 0 ? 'rgba(180,83,9,0.2)' : 'var(--border)'}`,
              borderRadius: '99px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: streaks.currentStreak > 0 ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'background 0.15s',
            }}
          >
            <Flame style={{ width: '13px', height: '13px' }} />
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              {streaks.currentStreak}d
            </span>
          </button>

          {/* Sign In / Account */}
          <button
            onClick={() => { Haptics.tap(); openAuthModal(); }}
            title={profile.googleConnected ? `${profile.email}` : 'Sign in'}
            className="btn-secondary"
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              borderRadius: '99px',
              ...(profile.googleConnected ? {
                background: 'var(--bg-card-alt)',
                color: 'var(--text-secondary)',
              } : {}),
            }}
          >
            {profile.googleConnected ? (
              <>
                <UserCheck style={{ width: '13px', height: '13px' }} />
                <span className="hidden sm:inline">
                  {profile.name?.split(' ')[0] || 'Account'}
                </span>
              </>
            ) : (
              <>
                <LogIn style={{ width: '13px', height: '13px' }} />
                <span>Sign in</span>
              </>
            )}
          </button>

          {/* Notification bell */}
          <button
            onClick={handleToggleNotifications}
            title={notifPerm === 'granted' ? 'Notifications on' : 'Enable notifications'}
            className="btn-ghost"
            style={{
              padding: '5px',
              color: notifPerm === 'granted' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {notifPerm === 'granted'
              ? <Bell style={{ width: '16px', height: '16px' }} />
              : <BellOff style={{ width: '16px', height: '16px' }} />
            }
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => { Haptics.tap(); toggleTheme(); }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="btn-ghost"
            style={{ padding: '5px', color: 'var(--text-muted)' }}
          >
            {isDark
              ? <Sun style={{ width: '16px', height: '16px', color: '#FBBF24' }} />
              : <Moon style={{ width: '16px', height: '16px' }} />
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
              padding: '5px',
              color: cloudSyncStatus === 'syncing' || profile.googleConnected || cloudSyncStatus === 'synced'
                ? 'var(--success)'
                : 'var(--text-muted)',
            }}
          >
            {cloudSyncStatus === 'syncing'
              ? <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              : profile.googleConnected || cloudSyncStatus === 'synced'
              ? <Cloud style={{ width: '16px', height: '16px' }} />
              : <CloudOff style={{ width: '16px', height: '16px' }} />
            }
          </button>

        </div>
      </div>

      {/* ── Desktop tab bar visible class fix ────────── */}
      <style>{`
        @media (min-width: 768px) {
          header nav.hidden { display: flex !important; }
        }
      `}</style>
    </header>
  );
};
