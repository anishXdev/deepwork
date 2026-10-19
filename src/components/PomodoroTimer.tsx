import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Headphones,
  Maximize2,
  Minimize2,
  Coffee,
  Timer,
  Lock
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const PomodoroTimer: React.FC = () => {
  const {
    subjects,
    topics,
    settings,
    timerMode,
    timeLeft,
    isTimerRunning,
    timerSelectedSubjectId,
    setTimerSelectedSubjectId,
    timerSelectedTopicId,
    setTimerSelectedTopicId,
    studiedSecondsInSession,
    ambientSoundType,
    setAmbientSoundType,
    startTimer,
    pauseTimer,
    resetTimer,
    switchTimerMode,
    setCustomTimerMinutes,
    addFiveMinutes,
    manualCompleteAndLog,
    enableStrictFocus,
    isTourOpen,
    tourStep
  } = useApp();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const workDuration = settings.pomodoroWorkMinutes * 60;
  const breakDuration = settings.pomodoroBreakMinutes * 60;
  const longBreakDuration = settings.pomodoroLongBreakMinutes * 60;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTimeForMode = timerMode === 'work' ? workDuration : timerMode === 'break' ? breakDuration : longBreakDuration;
  const fillPercent = Math.min(100, Math.max(0, Math.round(((totalTimeForMode - timeLeft) / totalTimeForMode) * 100)));

  const currentSubject = subjects.find(s => s.id === timerSelectedSubjectId);
  const availableTopics = topics.filter(t => t.subjectId === timerSelectedSubjectId);
  const currentTopic = topics.find(t => t.id === timerSelectedTopicId);

  const isGatePrep = Boolean(settings.isGatePrep);

  const gateTimerPresets = [
    { mins: 25, label: '🍅 25m Concept', desc: 'Pomodoro' },
    { mins: 45, label: '📝 45m PYQ Sprint', desc: '15–20 PYQs' },
    { mins: 90, label: '🧪 90m Subject Test', desc: '30 Questions' },
    { mins: 180, label: '🏆 180m Full GATE Mock', desc: '65 Qs • 100 Marks' }
  ];

  return (
    <div
      className={`max-w-2xl mx-auto px-4 py-6 pb-28 relative ${isFullscreen ? 'fixed inset-0 z-50 flex flex-col justify-center' : ''}`}
      style={isFullscreen ? { background: 'var(--bg-app)' } : {}}
    >

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => {
            Haptics.notification();
            enableStrictFocus();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
          }}
          title="Strict Focus: Fullscreen immersion lockdown, blocks tab switching, alerts on distraction"
        >
          <Lock className="w-3.5 h-3.5 animate-pulse" />
          <span>{isGatePrep ? 'Strict CBT Exam Lockdown' : 'Strict Focus Lockdown'}</span>
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Immersion Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="p-1 rounded-xl flex items-center gap-1" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => switchTimerMode('work')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: timerMode === 'work' ? 'var(--bg-card)' : 'transparent',
              color: timerMode === 'work' ? 'var(--accent)' : 'var(--text-secondary)',
              boxShadow: timerMode === 'work' ? 'var(--shadow-sm)' : 'none',
              border: timerMode === 'work' ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Focus {settings.pomodoroWorkMinutes}m</span>
          </button>
          <button
            onClick={() => switchTimerMode('break')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: timerMode === 'break' ? 'var(--bg-card)' : 'transparent',
              color: timerMode === 'break' ? '#10b981' : 'var(--text-secondary)',
              boxShadow: timerMode === 'break' ? 'var(--shadow-sm)' : 'none',
              border: timerMode === 'break' ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Rest 5m</span>
          </button>
          <button
            onClick={() => switchTimerMode('long_break')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: timerMode === 'long_break' ? 'var(--bg-card)' : 'transparent',
              color: timerMode === 'long_break' ? '#6366f1' : 'var(--text-secondary)',
              boxShadow: timerMode === 'long_break' ? 'var(--shadow-sm)' : 'none',
              border: timerMode === 'long_break' ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Break 15m</span>
          </button>
        </div>

        {/* GATE Presets */}
        {isGatePrep && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {gateTimerPresets.map(preset => {
              const isSelected = timerMode === 'work' && settings.pomodoroWorkMinutes === preset.mins;
              return (
                <button
                  key={preset.mins}
                  type="button"
                  onClick={() => {
                    Haptics.tap();
                    setCustomTimerMinutes(preset.mins);
                  }}
                  title={preset.desc}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                  style={{
                    border: '1px solid var(--border)',
                    background: isSelected ? 'rgba(180,83,9,0.12)' : 'var(--bg-card)',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clean Circle Timer */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center mb-8 select-none">
        {/* SVG Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none"
            strokeWidth="4"
            stroke="var(--bg-card-alt)"
          />
          <circle cx="50" cy="50" r="44" fill="none"
            strokeWidth="4"
            stroke="var(--accent)"
            strokeLinecap="round"
            strokeDasharray={276.5}
            strokeDashoffset={276.5 - (276.5 * fillPercent) / 100}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>

        {/* Center Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <span className="font-black tracking-tighter font-mono" style={{ fontSize: '3.2rem', color: 'var(--text-primary)' }}>
            {formatTime(timeLeft)}
          </span>

          <span className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
            {timerMode === 'work' ? 'Focus' : 'Rest'}
          </span>

          {timerMode === 'work' && currentTopic && (
            <span className="text-xs font-semibold max-w-[180px] truncate mt-2 px-3 py-0.5 rounded-full"
              style={{ background: 'var(--bg-card-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {currentTopic.name}
            </span>
          )}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={resetTimer}
          className="p-3.5 rounded-xl transition-all active:scale-95"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => (isTimerRunning ? pauseTimer() : startTimer())}
          className={`px-8 py-3.5 rounded-xl text-white font-extrabold text-base flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isTourOpen && tourStep === 2 && !isTimerRunning ? 'ring-2 ring-offset-2 animate-pulse' : ''
          }`}
          style={{
            background: isTimerRunning ? '#b45309' : 'var(--accent)',
            boxShadow: '0 4px 14px rgba(180,83,9,0.3)',
          }}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-5 h-5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Start</span>
            </>
          )}
        </button>

        <button
          onClick={addFiveMinutes}
          className="p-3.5 rounded-xl transition-all active:scale-95 text-xs font-mono font-bold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Add 5 Minutes"
        >
          +5m
        </button>

        {timerMode === 'work' && studiedSecondsInSession >= 30 && (
          <button
            onClick={manualCompleteAndLog}
            className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
            title="Log Session Now"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* Focus Target & Ambient Sound */}
      <div className="card rounded-2xl p-5 space-y-4" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Focus Target
            </h3>
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Ring fills with progress
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Subject
            </label>
            <select
              value={timerSelectedSubjectId}
              onChange={e => {
                setTimerSelectedSubjectId(e.target.value);
                setTimerSelectedTopicId('');
              }}
              className="input-base w-full text-xs"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Topic (Optional)
            </label>
            <select
              value={timerSelectedTopicId}
              onChange={e => setTimerSelectedTopicId(e.target.value)}
              className="input-base w-full text-xs"
            >
              <option value="">-- General Subject Study --</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.approxHours}h)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ambient Sounds */}
        <div className="flex flex-wrap items-center justify-between pt-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Ambient:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['none', 'ocean', 'stream', 'rain'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAmbientSoundType(type)}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: ambientSoundType === type ? 'var(--accent)' : 'var(--bg-card-alt)',
                  color: ambientSoundType === type ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {type === 'none' ? 'Mute' : type === 'ocean' ? '🌊 Ocean' : type === 'stream' ? '🏞️ Brook' : '🌧️ Rain'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
