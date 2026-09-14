import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { sound } from '../services/audio';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  BookOpen,
  Headphones,
  Maximize2,
  Minimize2,
  Zap,
  Coffee
} from 'lucide-react';

type TimerMode = 'work' | 'break' | 'long_break';

export const PomodoroTimer: React.FC = () => {
  const { 
    subjects, 
    topics, 
    activeFocusTopic, 
    logStudySession, 
    settings 
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    activeFocusTopic ? activeFocusTopic.subjectId : subjects[0]?.id || ''
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    activeFocusTopic ? activeFocusTopic.id : ''
  );

  const [mode, setMode] = useState<TimerMode>('work');
  const workDuration = settings.pomodoroWorkMinutes * 60;
  const breakDuration = settings.pomodoroBreakMinutes * 60;
  const longBreakDuration = settings.pomodoroLongBreakMinutes * 60;

  const [timeLeft, setTimeLeft] = useState<number>(settings.pomodoroWorkMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [studiedSecondsInSession, setStudiedSecondsInSession] = useState<number>(0);
  const [ambientSoundType, setAmbientSoundType] = useState<'none' | 'rain' | 'whitenoise' | 'deepfocus'>('none');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Sync active focus topic if provided from outside
  useEffect(() => {
    if (activeFocusTopic) {
      setSelectedSubjectId(activeFocusTopic.subjectId);
      setSelectedTopicId(activeFocusTopic.id);
    }
  }, [activeFocusTopic]);

  // Set initial time when mode changes
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'work') {
      setTimeLeft(workDuration);
    } else if (newMode === 'break') {
      setTimeLeft(breakDuration);
    } else {
      setTimeLeft(longBreakDuration);
    }
  };

  // Timer countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });

        if (mode === 'work') {
          setStudiedSecondsInSession(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Handle ambient audio
  useEffect(() => {
    if (isRunning && ambientSoundType !== 'none') {
      sound.startAmbientSound(ambientSoundType);
    } else {
      sound.stopAmbientSound();
    }
    return () => sound.stopAmbientSound();
  }, [isRunning, ambientSoundType]);

  // On timer countdown completion
  const handleTimerComplete = () => {
    setIsRunning(false);
    sound.playCompletionChime();

    if (mode === 'work') {
      const minutesCompleted = Math.max(1, Math.round(workDuration / 60));
      logStudySession(
        selectedSubjectId,
        selectedTopicId || undefined,
        minutesCompleted,
        'pomodoro'
      );
      setStudiedSecondsInSession(0);

      // Auto switch to break if configured
      switchMode('break');
    } else {
      switchMode('work');
    }
  };

  // Manually log whatever time was studied
  const handleManualCompleteAndLog = () => {
    setIsRunning(false);
    if (studiedSecondsInSession >= 30) {
      const minutes = Math.round(studiedSecondsInSession / 60 * 10) / 10;
      logStudySession(
        selectedSubjectId,
        selectedTopicId || undefined,
        Math.max(1, Math.round(minutes)),
        'pomodoro'
      );
      sound.playCompletionChime();
    }
    setStudiedSecondsInSession(0);
    setTimeLeft(workDuration);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'work') setTimeLeft(workDuration);
    else if (mode === 'break') setTimeLeft(breakDuration);
    else setTimeLeft(longBreakDuration);
  };

  const addFiveMinutes = () => {
    setTimeLeft(prev => prev + 300);
  };

  // Formatting helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTimeForMode = mode === 'work' ? workDuration : mode === 'break' ? breakDuration : longBreakDuration;
  const progressPercent = ((totalTimeForMode - timeLeft) / totalTimeForMode) * 100;
  const strokeDashoffset = 100 - progressPercent;

  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const availableTopics = topics.filter(t => t.subjectId === selectedSubjectId);
  const currentTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 pb-28 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center' : ''}`}>
      
      {/* Fullscreen button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Distraction-Free Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Mode Switcher Tabs (Minimalist Symbols & Labels) */}
      <div className="flex items-center justify-center space-x-2 mb-8">
        <div className="p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 flex items-center space-x-1">
          <button
            onClick={() => switchMode('work')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'work'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Focus 25m</span>
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'break'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Rest 5m</span>
          </button>
          <button
            onClick={() => switchMode('long_break')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'long_break'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Break 15m</span>
          </button>
        </div>
      </div>

      {/* Central Circular Timer Display */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto flex items-center justify-center mb-8">
        
        {/* SVG Progress Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            className="text-slate-200 dark:text-slate-800/80"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            style={{
              strokeDasharray: 276.46,
              strokeDashoffset: (276.46 * strokeDashoffset) / 100,
              stroke: currentSubject?.color || '#6366f1'
            }}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Time Text Inside Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-5xl sm:text-6xl font-black tracking-tighter text-slate-900 dark:text-slate-100 font-mono">
            {formatTime(timeLeft)}
          </span>

          <span className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mt-2">
            {mode === 'work' ? '⚡ Deep Focus' : '☕ Recharge'}
          </span>

          {mode === 'work' && currentTopic && (
            <span className="text-xs text-indigo-600 dark:text-indigo-300 font-bold max-w-[200px] truncate mt-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              {currentTopic.name}
            </span>
          )}
        </div>
      </div>

      {/* Timer Controls with Minimal Symbols */}
      <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-8">
        <button
          onClick={handleReset}
          className="p-3.5 rounded-2xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-8 py-3.5 rounded-2xl text-white font-extrabold text-base flex items-center space-x-2 shadow-lg transition-all active:scale-95 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
          }`}
        >
          {isRunning ? (
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
          className="p-3.5 rounded-2xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-mono font-bold"
          title="Add 5 Minutes"
        >
          +5m
        </button>

        {mode === 'work' && studiedSecondsInSession >= 30 && (
          <button
            onClick={handleManualCompleteAndLog}
            className="flex items-center space-x-1.5 px-3.5 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
            title="Log Session Now"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Log</span>
          </button>
        )}
      </div>

      {/* Target Subject & Topic Selector Card */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Focus Target
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Auto-logs to subject & weekly goal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Subject Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicId('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Topic (Optional)
            </label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- General Study --</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.approxHours}h)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ambient Sound Selector with minimal symbols */}
        <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
          <div className="flex items-center space-x-2">
            <Headphones className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ambient Sound:</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {(['none', 'rain', 'whitenoise', 'deepfocus'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAmbientSoundType(type)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                  ambientSoundType === type
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
                }`}
              >
                {type === 'none' ? 'Off' : type === 'rain' ? '🌧️ Rain' : type === 'whitenoise' ? '📻 White' : '🌊 Drone'}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
