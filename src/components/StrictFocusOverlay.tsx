import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { sound } from '../services/audio';
import { Notifications } from '../services/notifications';
import { Haptics } from '../utils/haptics';
import { DStudyLogo } from './DStudyLogo';
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Flame, 
  ShieldAlert, 
  Sparkles,
  Waves,
  CloudRain,
  Radio,
  Clock
} from 'lucide-react';
import { AmbientSoundType } from '../types';

export const StrictFocusOverlay: React.FC = () => {
  const { 
    isStrictFocusActive, 
    disableStrictFocus, 
    distractionCount, 
    incrementDistractionCount,
    timeLeft, 
    isTimerRunning, 
    timerMode, 
    activeFocusTopic, 
    subjects, 
    streaks,
    ambientSoundType, 
    setAmbientSoundType,
    settings
  } = useApp();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<any>(null);

  const currentSubject = subjects.find(s => s.id === activeFocusTopic?.subjectId) || subjects[0];

  // 1. Enter Fullscreen on activation
  useEffect(() => {
    if (isStrictFocusActive) {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isStrictFocusActive]);

  // 2. Prevent page reload or tab closure via beforeunload
  useEffect(() => {
    if (!isStrictFocusActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Strict Focus Mode is active! Are you sure you want to abandon your session?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStrictFocusActive]);

  // 3. Tab-switch / Visibility change detection (Anti-Distraction Shield)
  useEffect(() => {
    if (!isStrictFocusActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized!
        incrementDistractionCount();
        sound.playWarningAlert();
        Notifications.showToast('⚠️ Distraction detected! Stay locked into dstudy.', 'warning');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStrictFocusActive, incrementDistractionCount]);

  if (!isStrictFocusActive) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalModeDuration = settings.pomodoroWorkMinutes * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalModeDuration - timeLeft) / totalModeDuration) * 100));

  // Emergency Unlock: Hold for 5 seconds
  const startHoldExit = () => {
    Haptics.tap();
    setHoldProgress(0);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          Haptics.success();
          disableStrictFocus();
          Notifications.showToast('Strict Focus Mode terminated early.', 'info');
          return 100;
        }
        return prev + 4; // ~2.5 seconds hold
      });
    }, 100);
  };

  const cancelHoldExit = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#02070d] text-white flex flex-col justify-between p-6 select-none overflow-hidden animate-in fade-in duration-300">
      
      {/* Dynamic Ambient Background Glow */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${currentSubject?.color || '#0d9488'} 0%, transparent 65%)`
        }}
      />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DStudyLogo size={32} showText={true} />
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono tracking-wider animate-pulse">
            <Lock className="w-3.5 h-3.5" />
            <span>STRICT FOCUS ACTIVE</span>
          </div>
        </div>

        {/* Distraction Meter & Ambient Sounds */}
        <div className="flex items-center space-x-3">
          {distractionCount > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold animate-bounce">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>{distractionCount} {distractionCount === 1 ? 'Tab Switch' : 'Tab Switches'}</span>
            </div>
          )}

          {/* Ambient Sound Switcher */}
          <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-teal-500/30 backdrop-blur-md">
            {[
              { id: 'none', label: 'Mute', icon: VolumeX },
              { id: 'ocean', label: 'Ocean', icon: Waves },
              { id: 'rain', label: 'Rain', icon: CloudRain },
              { id: 'whitenoise', label: 'Drone', icon: Radio },
            ].map(snd => {
              const Icon = snd.icon;
              const isActive = ambientSoundType === snd.id;
              return (
                <button
                  key={snd.id}
                  onClick={() => {
                    Haptics.tap();
                    setAmbientSoundType(snd.id as AmbientSoundType);
                    sound.playAmbient(snd.id as AmbientSoundType);
                  }}
                  className={`p-2 rounded-xl text-xs transition-all ${
                    isActive 
                      ? 'bg-teal-500/30 text-teal-200 border border-teal-400/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={snd.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Emergency Unlock Trigger */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
            title="Emergency Exit"
          >
            <Unlock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center 3D Focus Core */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6 my-auto">
        
        {/* Active Subject & Topic Badge */}
        <div className="text-center space-y-2">
          {currentSubject && (
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentSubject.color }} />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                {currentSubject.name}
              </span>
            </div>
          )}
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg max-w-xl text-center">
            {activeFocusTopic?.name || 'Deep Study Session'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-300/80 font-medium">
            Lock-in mode is active. Tab switching and app navigation are restricted.
          </p>
        </div>

        {/* 3D Liquid Sphere Countdown Vessel */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full liquid-sphere flex items-center justify-center shadow-2xl p-4">
          
          {/* Internal oscillating water fill */}
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-b-full overflow-hidden transition-all duration-1000"
            style={{ height: `${progressPercent}%` }}
          >
            <div className="w-full h-full bg-gradient-to-t from-teal-600/70 to-cyan-400/50 backdrop-blur-sm" />
          </div>

          {/* Countdown Clock Face */}
          <div className="relative z-10 text-center space-y-2">
            <span className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {formatTime(timeLeft)}
            </span>
            <div className="flex items-center justify-center space-x-2 text-xs font-mono text-teal-200">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{Math.round(progressPercent)}% elapsed</span>
            </div>
          </div>
        </div>

        {/* Motivation Pill */}
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-black/40 px-4 py-2 rounded-2xl border border-teal-500/20 backdrop-blur-md">
          <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Keep pushing — your {streaks.currentStreak}-day streak is counting on you</span>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>Session auto-completes and unlocks when timer finishes</span>
        <span>dstudy lockdown engine</span>
      </div>

      {/* Emergency Unlock Modal Barrier */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-rose-500/40 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Emergency Exit Strict Mode?</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Strict Focus protects your cognitive flow. Leaving early interrupts your habit momentum and cancels this study block.
              </p>
            </div>

            {/* Hold Button Barrier */}
            <div className="space-y-2">
              <button
                onMouseDown={startHoldExit}
                onMouseUp={cancelHoldExit}
                onMouseLeave={cancelHoldExit}
                onTouchStart={startHoldExit}
                onTouchEnd={cancelHoldExit}
                className="relative w-full py-3.5 rounded-2xl bg-rose-600/30 border border-rose-500 text-rose-200 font-bold text-xs overflow-hidden select-none active:scale-[0.98] transition-transform"
              >
                {/* Hold Progress Bar */}
                <div 
                  className="absolute inset-0 bg-rose-600 transition-all duration-75"
                  style={{ width: `${holdProgress}%` }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Unlock className="w-4 h-4" />
                  <span>{holdProgress > 0 ? `Hold to Abort (${holdProgress}%)` : 'Press & Hold to Abort (3s)'}</span>
                </span>
              </button>
              <p className="text-[10px] text-slate-400 font-mono">Hold the button until full to confirm exit</p>
            </div>

            <button
              onClick={() => {
                cancelHoldExit();
                setShowExitConfirm(false);
              }}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline"
            >
              Resume Focus Session
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
