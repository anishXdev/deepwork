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
  Lock,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Plus,
  Minus
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const PomodoroTimer: React.FC = () => {
  const {
    tags,
    subjects,
    topics,
    userGamification,
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
  const [isCustomTimerModalOpen, setIsCustomTimerModalOpen] = useState<boolean>(false);
  const [customInputMinutes, setCustomInputMinutes] = useState<number>(settings.pomodoroWorkMinutes || 25);

  const workDuration = settings.pomodoroWorkMinutes * 60;
  const breakDuration = settings.pomodoroBreakMinutes * 60;
  const longBreakDuration = settings.pomodoroLongBreakMinutes * 60;

  const totalTimeForMode = timerMode === 'work' ? workDuration : timerMode === 'break' ? breakDuration : longBreakDuration;
  const fillPercent = Math.min(100, Math.max(0, Math.round(((totalTimeForMode - timeLeft) / totalTimeForMode) * 100)));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTag = tags.find(t => t.id === timerSelectedSubjectId);
  const currentSubject = currentTag 
    ? { id: currentTag.id, name: `#${currentTag.name}`, color: currentTag.color } 
    : subjects.find(s => s.id === timerSelectedSubjectId);
  const availableTopics = topics.filter(t => 
    (t.tags && t.tags.includes(timerSelectedSubjectId)) || t.subjectId === timerSelectedSubjectId
  );
  const currentTopic = topics.find(t => t.id === timerSelectedTopicId);

  const isGatePrep = Boolean(settings.isGatePrep);

  // Quick preset options
  const standardPresets = [
    { mins: 15, label: '15m Sprint' },
    { mins: 25, label: '25m Focus' },
    { mins: 45, label: '45m Deep Work' },
    { mins: 60, label: '60m Lecture' },
    { mins: 90, label: '90m Exam Block' },
  ];

  const handleApplyCustomTime = (mins: number) => {
    const valid = Math.max(1, Math.min(300, Math.round(mins)));
    Haptics.tap();
    setCustomTimerMinutes(valid);
    setIsCustomTimerModalOpen(false);
  };

  // Focus flow state calculation
  const getFlowStateText = () => {
    if (timerMode !== 'work') return '☕ Rest & Refresh';
    if (!isTimerRunning && studiedSecondsInSession === 0) return 'Ready to Dive In';
    if (fillPercent < 25) return '🌊 Entering Flow State';
    if (fillPercent < 60) return '⚡ Peak Concentration Zone';
    if (fillPercent < 85) return '🧠 High Cognitive Rhythm';
    return '🏁 Final Sprint & Mastery';
  };

  return (
    <div
      className={`max-w-2xl mx-auto px-4 py-5 pb-28 relative ${
        isFullscreen ? 'fixed inset-0 z-50 flex flex-col justify-center' : ''
      }`}
      style={isFullscreen ? { background: 'var(--bg-app)' } : {}}
    >
      {/* ── Top Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            Haptics.notification();
            enableStrictFocus();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
          }}
          title="Strict Focus: Fullscreen immersion lockdown, blocks distraction"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{isGatePrep ? 'Strict Exam Lockdown' : 'Strict Focus Mode'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Custom Timer Duration Trigger */}
          <button
            onClick={() => {
              setCustomInputMinutes(settings.pomodoroWorkMinutes);
              setIsCustomTimerModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}
            title="Set custom duration in minutes"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Custom Time ({settings.pomodoroWorkMinutes}m)</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Focus'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Mode Switcher & Quick Presets ──────────────────── */}
      <div className="flex flex-col items-center gap-3 mb-6">
        {/* Work / Break Mode Pills */}
        <div className="p-1 rounded-xl flex items-center gap-1" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => switchTimerMode('work')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              background: timerMode === 'long_break' ? 'var(--bg-card)' : 'transparent',
              color: timerMode === 'long_break' ? '#8b5cf6' : 'var(--text-secondary)',
              boxShadow: timerMode === 'long_break' ? 'var(--shadow-sm)' : 'none',
              border: timerMode === 'long_break' ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Break 15m</span>
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {standardPresets.map(preset => {
            const isSelected = timerMode === 'work' && settings.pomodoroWorkMinutes === preset.mins;
            return (
              <button
                key={preset.mins}
                type="button"
                onClick={() => {
                  Haptics.tap();
                  setCustomTimerMinutes(preset.mins);
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                style={{
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {preset.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCustomTimerModalOpen(true)}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer hover:underline text-blue-600"
            style={{ background: 'transparent' }}
          >
            + Other Min
          </button>
        </div>
      </div>

      {/* ── Dynamic Breathing Focus Ring ──────────────────── */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center mb-6 select-none">
        
        {/* Subtle breathing outer glow when timer is running */}
        {isTimerRunning && (
          <div
            className="absolute inset-2 rounded-full pointer-events-none transition-all duration-1000 animate-pulse"
            style={{
              background: timerMode === 'work' ? 'radial-gradient(circle, rgba(12,102,228,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
            }}
          />
        )}

        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="3.5"
            stroke="var(--bg-card-alt)"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="3.5"
            stroke={timerMode === 'work' ? 'var(--accent)' : '#10b981'}
            strokeLinecap="round"
            strokeDasharray={276.5}
            strokeDashoffset={276.5 - (276.5 * fillPercent) / 100}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: isTimerRunning ? 'drop-shadow(0 0 6px rgba(12, 102, 228, 0.4))' : 'none'
            }}
          />
        </svg>

        {/* Dynamic Center Display */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <span
            className="font-black tracking-tight font-mono text-5xl sm:text-6xl transition-all"
            style={{
              color: 'var(--text-primary)',
              textShadow: isTimerRunning ? '0 2px 10px rgba(12,102,228,0.15)' : 'none'
            }}
          >
            {formatTime(timeLeft)}
          </span>

          {/* Flow status */}
          <span className="text-[11px] font-bold mt-1 transition-colors flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            {getFlowStateText()}
          </span>

          {/* Current Topic Pill */}
          {timerMode === 'work' && currentTopic && (
            <span
              className="text-[11px] font-semibold max-w-[200px] truncate mt-2 px-2.5 py-0.5 rounded-full"
              style={{
                background: 'var(--bg-card-alt)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)'
              }}
            >
              {currentTopic.name}
            </span>
          )}

          {/* Audio Visualizer Waves if ambient sound is playing */}
          {ambientSoundType !== 'none' && isTimerRunning && (
            <div className="flex items-center gap-1 mt-2.5">
              <span className="w-1 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="w-1 h-5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
              <span className="w-1 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '220ms' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Main Timer Controls ────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={resetTimer}
          className="p-3 rounded-xl transition-all active:scale-95 cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => (isTimerRunning ? pauseTimer() : startTimer())}
          className={`px-8 py-3 rounded-xl text-white font-extrabold text-base flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isTourOpen && tourStep === 2 && !isTimerRunning ? 'ring-2 ring-offset-2 animate-pulse' : ''
          }`}
          style={{
            background: isTimerRunning ? '#f59e0b' : 'var(--accent)',
            boxShadow: '0 4px 14px rgba(12, 102, 228, 0.25)',
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
          className="p-3 rounded-xl transition-all active:scale-95 text-xs font-mono font-bold cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Add 5 Minutes"
        >
          +5m
        </button>

        {timerMode === 'work' && studiedSecondsInSession >= 30 && (
          <button
            onClick={manualCompleteAndLog}
            className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
            title="Log Session Now"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* ── Gamification XP & Level Status Banner ───────── */}
      <div className="flex items-center justify-center mb-5">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold select-none shadow-xs"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)'
          }}
        >
          <span className="text-amber-500 font-bold">⭐ Lvl {userGamification.level}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-xs text-slate-500">{userGamification.levelTitle}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-mono text-blue-600 font-bold">{userGamification.xp} XP</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-[11px] text-emerald-600 font-semibold">+50 XP per block</span>
        </div>
      </div>

      {/* ── Focus Target & Ambient Sound Card ──────────────── */}
      <div className="rounded-xl p-4 space-y-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Linked Focus Workspace
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {studiedSecondsInSession > 0 ? `Session: ${Math.round(studiedSecondsInSession / 60)}m logged` : 'Select tag or topic'}
          </span>
        </div>

        {/* Quick Tag Selector Chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {tags.map(tag => {
              const isSelected = timerSelectedSubjectId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    Haptics.tap();
                    setTimerSelectedSubjectId(tag.id);
                    setTimerSelectedTopicId('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
                  style={{
                    background: isSelected ? `${tag.color}25` : 'var(--bg-card-alt)',
                    color: isSelected ? tag.color : 'var(--text-secondary)',
                    border: isSelected ? `1.5px solid ${tag.color}` : '1px solid var(--border)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <span>{tag.icon || '🏷️'}</span>
                  <span>#{tag.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Tag / Category
            </label>
            <select
              value={timerSelectedSubjectId}
              onChange={e => {
                setTimerSelectedSubjectId(e.target.value);
                setTimerSelectedTopicId('');
              }}
              className="input-base w-full text-xs py-1.5"
            >
              <option value="">-- Choose Tag or Category --</option>
              {tags.map(t => (
                <option key={t.id} value={t.id}>#{t.name}</option>
              ))}
              {subjects.filter(s => !tags.some(t => t.id === s.id)).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Topic / Task (Optional)
            </label>
            <select
              value={timerSelectedTopicId}
              onChange={e => setTimerSelectedTopicId(e.target.value)}
              className="input-base w-full text-xs py-1.5"
            >
              <option value="">-- General Category Focus --</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.approxHours}h)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ambient Sounds */}
        <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5">
            <Headphones className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Ambient Sound:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['none', 'ocean', 'stream', 'rain'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAmbientSoundType(type)}
                className="px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
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

      {/* ── Custom Timer Modal ─────────────────────────────── */}
      {isCustomTimerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Set Custom Focus Duration</h3>
              </div>
              <button
                onClick={() => setIsCustomTimerModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Big Minutes Number Display */}
            <div className="flex items-center justify-center gap-4 py-3">
              <button
                type="button"
                onClick={() => setCustomInputMinutes(Math.max(5, customInputMinutes - 5))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={customInputMinutes}
                  onChange={e => setCustomInputMinutes(Number(e.target.value) || 1)}
                  className="w-24 text-center font-black font-mono text-4xl bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <span className="text-sm font-bold text-slate-400">min</span>
              </div>

              <button
                type="button"
                onClick={() => setCustomInputMinutes(Math.min(300, customInputMinutes + 5))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={customInputMinutes}
              onChange={e => setCustomInputMinutes(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            {/* Quick shortcuts */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[15, 30, 45, 90].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCustomInputMinutes(m)}
                  className="py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600"
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomTimerModalOpen(false)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyCustomTime(customInputMinutes)}
                className="btn-primary text-xs px-4 py-1.5"
              >
                Apply Timer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
