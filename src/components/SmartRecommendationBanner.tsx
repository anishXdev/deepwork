import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Sparkles, TrendingUp, Target, CheckCircle2, ChevronRight, CalendarDays, Zap, Award, Settings2, CalendarPlus, GraduationCap } from 'lucide-react';
import { GATE_STREAM_SYLLABUS } from '../types';

export const SmartRecommendationBanner: React.FC = () => {
  const { sessions, settings, updateSettings, setActiveTab, loadGateStreamSyllabus, setStudyMode } = useApp();
  const [isEditingExamConfig, setIsEditingExamConfig] = useState(false);

  const isGatePrep = Boolean(settings.isGatePrep);
  const examDateStr = settings.gateExamDate || (isGatePrep ? '2027-02-06' : '');
  const targetStream = settings.gateTargetStream || 'CSE';
  const targetAir = settings.gateTargetAir || 'AIR < 100';
  const customExamName = settings.examName || 'Target Exam';

  const getDaysUntilExam = () => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr + 'T00:00:00');
    if (isNaN(examDate.getTime())) return null;
    const diffMs = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const daysUntilExam = getDaysUntilExam();

  const recommendation = AnalyticsService.getSmartPacingRecommendation(
    settings.weeklyHoursTarget,
    sessions,
    settings.weekStartsOnMonday
  );

  const getStatusBadge = () => {
    switch (recommendation.status) {
      case 'achieved':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          symbol: '🎉 Done'
        };
      case 'ahead':
        return {
          icon: TrendingUp,
          color: 'text-sky-500 dark:text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/20',
          symbol: '🚀 Ahead'
        };
      case 'behind':
        return {
          icon: Target,
          color: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          symbol: '⚡ Boost'
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-ocean-600 dark:text-aqua-400',
          bg: 'bg-ocean-500/10 border-ocean-500/20',
          symbol: '✨ On Track'
        };
    }
  };

  const badge = getStatusBadge();
  const percentComplete = Math.min(
    100,
    Math.round((recommendation.hoursStudiedThisWeek / recommendation.weeklyTarget) * 100)
  );

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-ocean-300/30 dark:border-ocean-900/60 mb-6 relative overflow-hidden transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Exam Countdown & Pacing Metrics */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          
          {/* Metric 1: Exam Date Countdown (Works for both Simple Mode & GATE Mode) */}
          <div 
            onClick={() => setIsEditingExamConfig(!isEditingExamConfig)}
            className="flex items-center space-x-2.5 cursor-pointer group"
            title="Click to set Exam Date, see days left, or toggle GATE Prep Mode"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm ${
              isGatePrep
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                : 'bg-teal-500/15 border-teal-500/30 text-teal-500'
            }`}>
              {daysUntilExam !== null ? <Award className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
            </div>
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                isGatePrep ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'
              }`}>
                {isGatePrep ? (
                  <>
                    <span>GATE {targetStream}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-600 dark:text-amber-300">
                      {targetAir}
                    </span>
                  </>
                ) : (
                  <span>{daysUntilExam !== null ? customExamName : 'Exam Countdown'}</span>
                )}
                <Settings2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
              </div>

              {daysUntilExam !== null ? (
                <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {daysUntilExam}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">days left</span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-300 group-hover:underline flex items-center gap-1 mt-0.5">
                  <span>+ Set Exam Date</span>
                </div>
              )}
            </div>
          </div>

          {/* Metric 2: Daily Pace Gauge */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center text-ocean-600 dark:text-aqua-400 flex-shrink-0">
              <Zap className="w-4 h-4 fill-ocean-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-ocean-700/80 dark:text-ocean-300/80 flex items-center gap-1">
                <span>Daily Pace</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${badge.bg} ${badge.color}`}>
                  {badge.symbol}
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.recommendedDailyHours}<span className="text-xs font-normal text-slate-500 dark:text-slate-400">h / day</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Weekly Progress */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-ocean-700/80 dark:text-ocean-300/80">
                Week Target
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.hoursStudiedThisWeek}<span className="text-xs text-slate-400">/{recommendation.weeklyTarget}h</span>
                <span className="text-xs text-ocean-600 dark:text-aqua-400 ml-1.5 font-sans font-semibold">({percentComplete}%)</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Remaining */}
          <div className="hidden sm:flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-aqua-500/10 border border-aqua-500/20 flex items-center justify-center text-aqua-600 dark:text-aqua-400 flex-shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-ocean-700/80 dark:text-ocean-300/80">
                Week Left
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.hoursRemaining}h <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({recommendation.daysRemainingInWeek}d)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Actions: Mode Toggle Pill & Graph View */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            type="button"
            onClick={() => setStudyMode(!isGatePrep, targetStream)}
            title={isGatePrep ? 'Switch to Simple Study Mode' : 'Preparing for GATE? Enable GATE Prep Mode'}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isGatePrep
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25'
                : 'bg-white/60 dark:bg-abyss-card/60 border-ocean-200/50 dark:border-ocean-900/60 text-slate-600 dark:text-slate-400 hover:text-teal-400'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isGatePrep ? 'GATE Mode: ON' : 'GATE Prep?'}</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-abyss-card/80 hover:bg-ocean-500/10 dark:hover:bg-ocean-950/50 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-ocean-200/50 dark:border-ocean-900/60 transition-colors cursor-pointer"
          >
            <span>📊 {isGatePrep ? 'GATE Insights' : 'Insights'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Inline Exam Date & Study Mode Configuration Drawer */}
      {isEditingExamConfig && (
        <div className="mt-4 pt-3.5 border-t border-teal-500/20 space-y-3 text-xs animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-teal-200">
              📅 Exam Countdown & Mode Settings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStudyMode(false)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  !isGatePrep
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                📚 Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setStudyMode(true, targetStream)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                  isGatePrep
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                🎓 GATE Exam Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Date of Exam
              </label>
              <input
                type="date"
                value={examDateStr}
                onChange={e => updateSettings({ gateExamDate: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-teal-500/30 font-mono text-slate-800 dark:text-slate-100"
              />
            </div>

            {isGatePrep ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    GATE Stream & Syllabus
                  </label>
                  <select
                    value={targetStream}
                    onChange={e => {
                      const newStream = e.target.value;
                      updateSettings({ gateTargetStream: newStream });
                      loadGateStreamSyllabus(newStream, false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-teal-500/30 font-bold text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(GATE_STREAM_SYLLABUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Target Rank / Score
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AIR < 100"
                    value={targetAir}
                    onChange={e => updateSettings({ gateTargetAir: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-teal-500/30 font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Exam Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Semester Finals, CAT, Placement Prep..."
                  value={settings.examName || ''}
                  onChange={e => updateSettings({ examName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-teal-500/30 font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingExamConfig(false)}
                className="w-full py-1.5 px-3 rounded-xl liquid-btn text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slim visual gradient progress track */}
      <div className="mt-3.5 w-full bg-slate-200/80 dark:bg-abyss-950 rounded-full h-1.5 overflow-hidden border border-ocean-300/40 dark:border-ocean-900/60">
        <div 
          className="h-full bg-gradient-to-r from-ocean-500 via-aqua-400 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${percentComplete}%` }}
        />
      </div>
    </div>
  );
};
