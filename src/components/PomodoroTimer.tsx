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
  Waves,
  Coffee,
  Sparkles,
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
  // Liquid fill percentage: fills up from 12% to 100% as focus time progresses
  const fillPercent = Math.min(100, Math.max(12, Math.round(((totalTimeForMode - timeLeft) / totalTimeForMode) * 100)));

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
    <div className={`max-w-2xl mx-auto px-4 py-6 pb-28 relative z-10 ${
      isFullscreen ? 'fixed inset-0 z-50 bg-[#030a12] flex flex-col justify-center' : ''
    }`}>
      
      {/* Header Bar: Strict Focus Lockdown & Fullscreen */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            Haptics.notification();
            enableStrictFocus();
          }}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
          title="Strict Focus: Fullscreen immersion lockdown, blocks tab switching, alerts on distraction"
        >
          <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>{isGatePrep ? 'Strict CBT Exam Lockdown' : 'Strict Focus Lockdown'}</span>
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 sm:p-2.5 rounded-2xl glass-card text-slate-500 hover:text-teal-400 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : '3D Fluid Immersion Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Mode Switcher Tabs (Fluid Pills) */}
      <div className="flex flex-col items-center space-y-2.5 mb-7">
        <div className="p-1 rounded-2xl glass-panel flex items-center space-x-1 shadow-md">
          <button
            onClick={() => switchTimerMode('work')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timerMode === 'work'
                ? 'liquid-btn text-white shadow-lg shadow-teal-500/30'
                : 'text-slate-600 dark:text-teal-200/70 hover:text-teal-400'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Focus {settings.pomodoroWorkMinutes}m</span>
          </button>
          <button
            onClick={() => switchTimerMode('break')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timerMode === 'break'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-600 dark:text-teal-200/70 hover:text-teal-400'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Rest 5m</span>
          </button>
          <button
            onClick={() => switchTimerMode('long_break')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timerMode === 'long_break'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-slate-600 dark:text-teal-200/70 hover:text-teal-400'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Break 15m</span>
          </button>
        </div>

        {/* GATE Exam & Sprint Duration Presets (Only in GATE mode) */}
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
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-600 dark:text-teal-200 border-teal-400/60 shadow-sm scale-105'
                      : 'bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-teal-500/20 hover:border-teal-400/40 hover:text-teal-400'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3D Liquid Sphere Vessel Timer */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto flex items-center justify-center mb-9 select-none">
        
        {/* Outer 3D Glass Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-emerald-400/20 blur-xl animate-pulse-glow pointer-events-none" />

        {/* 3D Liquid Sphere Container */}
        <div className="w-full h-full liquid-sphere glass-card border border-teal-400/30 dark:border-cyan-400/25 flex items-center justify-center">
          
          {/* Liquid Water Fill with Moving Wave Crests */}
          <div 
            className="absolute left-0 right-0 bottom-0 transition-all duration-1000 ease-out overflow-hidden"
            style={{ height: `${fillPercent}%` }}
          >
            {/* Primary Liquid Wave */}
            <div className="absolute -top-6 left-0 w-[200%] h-8 opacity-70 animate-liquid-wave-1">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-cyan-400 dark:fill-cyan-500">
                <path d="M0,0 C150,90 350,-40 500,45 C650,130 900,-30 1200,30 L1200,120 L0,120 Z"></path>
              </svg>
            </div>

            {/* Secondary Liquid Wave */}
            <div className="absolute -top-7 left-0 w-[200%] h-9 opacity-80 animate-liquid-wave-2">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-teal-500/80 dark:fill-teal-600/80">
                <path d="M0,20 C200,-50 400,90 600,20 C800,-50 1000,80 1200,20 L1200,120 L0,120 Z"></path>
              </svg>
            </div>

            {/* Solid Deep Liquid Body */}
            <div className="w-full h-full bg-gradient-to-b from-teal-500/75 to-cyan-700/90 dark:from-teal-600/80 dark:to-cyan-950/95" />
          </div>

          {/* Floating Micro-droplet Bubbles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-white/40 absolute bottom-12 left-1/4 animate-float" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 absolute bottom-24 right-1/3 animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/30 absolute bottom-8 right-1/4 animate-float" style={{ animationDelay: '2.5s' }} />
          </div>

          {/* Centered 3D Glass Numbers Display */}
          <div className="relative z-20 flex flex-col items-center justify-center text-center p-4">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter font-mono text-slate-900 dark:text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {formatTime(timeLeft)}
            </span>

            <span className="text-xs uppercase tracking-widest font-extrabold text-teal-800 dark:text-teal-200 mt-2 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>{timerMode === 'work' ? 'Fluid Study State' : 'Refreshing Rest'}</span>
            </span>

            {timerMode === 'work' && currentTopic && (
              <span className="text-xs font-bold text-teal-900 dark:text-cyan-200 max-w-[210px] truncate mt-2 px-3 py-0.5 rounded-full bg-white/40 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-cyan-400/30 shadow-sm">
                {currentTopic.name}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Timer Controls: 3D Liquid Buttons */}
      <div className="flex items-center justify-center space-x-4 mb-9">
        <button
          onClick={resetTimer}
          className="p-3.5 rounded-2xl glass-card text-slate-600 dark:text-teal-300 hover:text-teal-500 dark:hover:text-white transition-all active:scale-95"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => (isTimerRunning ? pauseTimer() : startTimer())}
          className={`px-8 py-3.5 rounded-2xl text-white font-extrabold text-base flex items-center space-x-2 shadow-xl transition-all active:scale-95 cursor-pointer ${
            isTimerRunning
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              : 'liquid-btn'
          } ${
            isTourOpen && tourStep === 2 && !isTimerRunning
              ? 'ring-4 ring-teal-400/90 ring-offset-2 ring-offset-[#020b14] animate-pulse shadow-2xl shadow-teal-400/50'
              : ''
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-5 h-5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Flow</span>
            </>
          )}
        </button>

        <button
          onClick={addFiveMinutes}
          className="p-3.5 rounded-2xl glass-card text-slate-700 dark:text-teal-200 hover:text-teal-500 dark:hover:text-white transition-all active:scale-95 text-xs font-mono font-bold"
          title="Add 5 Minutes"
        >
          +5m
        </button>

        {timerMode === 'work' && studiedSecondsInSession >= 30 && (
          <button
            onClick={manualCompleteAndLog}
            className="flex items-center space-x-1.5 px-4 py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-all active:scale-95 shadow-md"
            title="Log Session Now"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* Target Focus Target & Water Sound Effects */}
      <div className="glass-card rounded-3xl p-5 border border-teal-500/25 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-teal-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-teal-200">
              Focus Stream Target
            </h3>
          </div>
          <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400/80">
            Water level fills with study time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-teal-300 mb-1">
              Subject
            </label>
            <select
              value={timerSelectedSubjectId}
              onChange={e => {
                setTimerSelectedSubjectId(e.target.value);
                setTimerSelectedTopicId('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-teal-500/30 text-slate-800 dark:text-teal-100 text-xs font-semibold focus:outline-none focus:border-teal-400"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-teal-300 mb-1">
              Topic (Optional)
            </label>
            <select
              value={timerSelectedTopicId}
              onChange={e => setTimerSelectedTopicId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-teal-500/30 text-slate-800 dark:text-teal-100 text-xs font-semibold focus:outline-none focus:border-teal-400"
            >
              <option value="">-- General Subject Study --</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.approxHours}h)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ambient Water & Nature Sounds */}
        <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-teal-500/15">
          <div className="flex items-center space-x-2">
            <Headphones className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-teal-200">Fluid Soundscape:</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {(['none', 'ocean', 'stream', 'rain'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAmbientSoundType(type)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  ambientSoundType === type
                    ? 'liquid-btn text-white shadow-md'
                    : 'bg-white/50 dark:bg-slate-900/60 text-slate-600 dark:text-teal-300 hover:text-teal-500 border border-teal-500/20'
                }`}
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
