import React from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, BookOpen, Timer, BarChart3 } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isTimerRunning, timeLeft } = useApp();

  const navItems = [
    { id: 'study',     label: 'Today',     icon: CalendarDays },
    { id: 'subjects',  label: 'Subjects',  icon: BookOpen     },
    { id: 'timer',     label: 'Focus',     icon: Timer        },
    { id: 'analytics', label: 'Analytics', icon: BarChart3    },
  ] as const;

  const formatTimerShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        paddingTop: '6px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
        paddingLeft: '8px',
        paddingRight: '8px',
      }}
      className="md:hidden"
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const showTimer = item.id === 'timer' && isTimerRunning && !isActive;

        return (
          <button
            key={item.id}
            onClick={() => { Haptics.tap(); setActiveTab(item.id); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 10px',
              borderRadius: '10px',
              border: 'none',
              background: isActive ? 'var(--bg-card-alt)' : 'transparent',
              cursor: 'pointer',
              gap: '2px',
              transition: 'background 0.15s ease',
              minWidth: '56px',
              position: 'relative',
            }}
          >
            {/* Active underline dot */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '2px',
                  borderRadius: '0 0 2px 2px',
                  background: 'var(--accent)',
                }}
              />
            )}

            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icon
                style={{
                  width: '18px',
                  height: '18px',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color 0.15s ease',
                }}
              />
              {/* Timer running dot */}
              {item.id === 'timer' && isTimerRunning && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-1px',
                    right: '-3px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    border: '1.5px solid var(--bg-app)',
                  }}
                />
              )}
            </span>

            <span
              style={{
                fontSize: '10px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                letterSpacing: '0.01em',
                transition: 'color 0.15s ease',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {showTimer ? formatTimerShort(timeLeft) : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
