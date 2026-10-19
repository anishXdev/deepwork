import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import {
  BarChart3,
  Flame,
  Target,
  Clock,
  CheckCircle2,
  TrendingUp,
  Layers,
  Settings2,
  Calendar,
  Play,
  Zap,
  CalendarRange,
  X,
  CalendarPlus,
  BookOpen,
  GraduationCap,
  Hash,
  Brain,
  Sparkles,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const AnalyticsDashboard: React.FC = () => {
  const {
    sessions,
    subjects,
    topics,
    tags,
    userGamification,
    exportBackup,
    importBackup,
    settings,
    updateSettings,
    streaks,
    setActiveFocusTopic,
    setActiveTab,
    openStreakModal,
    openAddTopicModal
  } = useApp();

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(settings.weeklyHoursTarget);
  const [heatmapRange, setHeatmapRange] = useState<'30days' | 'yearly'>('30days');
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    hours: number;
    x: number;
    y: number;
  } | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const hoursToday = AnalyticsService.getHoursStudiedToday(sessions);
  const hoursThisWeek = AnalyticsService.getHoursStudiedThisWeek(sessions, settings.weekStartsOnMonday);
  const hoursLeft = Math.max(0, Math.round((settings.weeklyHoursTarget - hoursThisWeek) * 10) / 10);
  const percentAchieved = Math.min(100, Math.round((hoursThisWeek / settings.weeklyHoursTarget) * 100));

  // Tag-based Time Distribution Range State
  const [tagTimeRange, setTagTimeRange] = useState<'all' | '30d' | '7d' | 'today'>('all');

  // Filtered sessions for the selected tag time range
  const tagFilteredSessions = useMemo(() => {
    if (tagTimeRange === 'all') return sessions;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (tagTimeRange === 'today') {
      return sessions.filter(s => s && s.startTime && s.startTime.startsWith(todayStr));
    }
    const days = tagTimeRange === '7d' ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return sessions.filter(s => s && s.startTime && new Date(s.startTime) >= cutoff);
  }, [sessions, tagTimeRange]);

  // Total hours in selected tag period
  const totalTagPeriodHours = Math.round(
    tagFilteredSessions.reduce((acc, s) => acc + (s.durationHours || (s.durationMinutes || 0) / 60), 0) * 10
  ) / 10;

  // Total all-time logged hours
  const totalAllTimeHours = Math.round(
    sessions.reduce((acc, s) => acc + (s.durationHours || (s.durationMinutes || 0) / 60), 0) * 10
  ) / 10;

  // Detailed Tag-Based Time Distribution
  const tagBreakdown = useMemo(() => {
    return tags.filter(Boolean).map(tag => {
      const matchingSessions = tagFilteredSessions.filter(s => s && (s.tagId === tag.id || s.subjectId === tag.id));
      const totalMinutes = matchingSessions.reduce((acc, s) => acc + (s.durationMinutes || (s.durationHours || 0) * 60), 0);
      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      const matchingTopics = topics.filter(t => t && ((t.tags && t.tags.includes(tag.id)) || t.subjectId === tag.id));
      const doneTopics = matchingTopics.filter(t => t.status === 'completed');
      const avgMinutesPerTask = doneTopics.length > 0 ? Math.round(totalMinutes / doneTopics.length) : 0;
      return {
        id: tag.id,
        name: tag.name,
        color: tag.color || '#0C66E4',
        icon: tag.icon || '🏷️',
        hours,
        totalMinutes,
        sessionsCount: matchingSessions.length,
        taskCount: matchingTopics.length,
        doneCount: doneTopics.length,
        avgMinutesPerTask,
        percentage: totalTagPeriodHours > 0 ? Math.round((hours / totalTagPeriodHours) * 100) : 0
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [tags, tagFilteredSessions, topics, totalTagPeriodHours]);

  // Deep work focus ratio (sessions with duration >= 25 mins)
  const deepWorkSessions = sessions.filter(s => (s.durationMinutes || (s.durationHours || 0) * 60) >= 25);
  const deepWorkRatio = sessions.length > 0 ? Math.round((deepWorkSessions.length / sessions.length) * 100) : 85;

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await importBackup(file);
    if (ok) {
      setBackupStatusMessage('✅ Backup restored successfully! All tasks, boards, and history preserved.');
      setTimeout(() => setBackupStatusMessage(null), 5000);
    } else {
      setBackupStatusMessage('❌ Failed to restore backup. Invalid format.');
      setTimeout(() => setBackupStatusMessage(null), 5000);
    }
  };

  const subjectBreakdown = AnalyticsService.getSubjectHoursBreakdown(
    subjects,
    sessions,
    'all',
    settings.weekStartsOnMonday
  );

  const dailyHistory = AnalyticsService.getDailyHistory(sessions, 7);
  const maxDailyHour = Math.max(...dailyHistory.map(d => d.hours), 4);

  const handleSaveTarget = () => {
    if (tempTarget > 0) {
      updateSettings({ weeklyHoursTarget: tempTarget });
    }
    setIsEditingTarget(false);
  };

  const getLast30DaysActivity = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hours = streaks.activityHistory[dateStr] || 0;
      days.push({ date: dateStr, hours, dayNum: d.getDate() });
    }
    return days;
  };
  const heatmapDays = getLast30DaysActivity();

  const getYearlyWeeks = () => {
    const weeks: { date: string; hours: number; month: string; isFuture: boolean }[][] = [];
    const today = new Date();
    const todayDayOfWeek = (today.getDay() + 6) % 7;

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - todayDayOfWeek));

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (52 * 7 - 1));

    for (let w = 0; w < 52; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const curDate = new Date(startDate);
        curDate.setDate(startDate.getDate() + (w * 7 + d));
        const dateStr = curDate.toISOString().split('T')[0];
        const hours = streaks.activityHistory[dateStr] || 0;
        const month = curDate.toLocaleString('default', { month: 'short' });
        week.push({ date: dateStr, hours, month, isFuture: curDate > today });
      }
      weeks.push(week);
    }
    return weeks;
  };

  const yearlyWeeks = getYearlyWeeks();
  const yearlyFlatDays = yearlyWeeks.flat().filter(d => !d.isFuture);
  const yearlyActiveDays = yearlyFlatDays.filter(d => d.hours > 0).length;
  const yearlyTotalHours = Math.round(yearlyFlatDays.reduce((acc, d) => acc + d.hours, 0) * 10) / 10;
  const maxYearlyDay = Math.max(...yearlyFlatDays.map(d => d.hours), 0);

  const selectedDayHours = selectedDate ? (streaks.activityHistory[selectedDate] || 0) : 0;
  const completedTopicsOnDate = selectedDate ? topics.filter(t =>
    t.status === 'completed' &&
    (t.updatedAt?.startsWith(selectedDate) || t.scheduledDate === selectedDate)
  ) : [];
  const sessionsOnDate = selectedDate ? sessions.filter(s =>
    s.startTime?.startsWith(selectedDate)
  ) : [];

  // Heatmap color helpers — clean blue activity scale
  const getHeatCell30 = (hours: number) => {
    if (hours > 3.5) return 'var(--accent)';
    if (hours > 2) return 'rgba(12, 102, 228, 0.7)';
    if (hours > 1) return 'rgba(12, 102, 228, 0.45)';
    if (hours > 0) return 'rgba(12, 102, 228, 0.2)';
    return 'var(--bg-card-alt)';
  };

  const getHeatCellYearly = (hours: number) => {
    if (hours > 4) return 'var(--accent)';
    if (hours > 2.5) return 'rgba(12, 102, 228, 0.7)';
    if (hours > 1) return 'rgba(12, 102, 228, 0.45)';
    if (hours > 0) return 'rgba(12, 102, 228, 0.2)';
    return 'var(--bg-card-alt)';
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Analytics & Pacing
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visual pacing, study metrics & activity heatmap</p>
          </div>
        </div>

        {/* Target Settings */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Target className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            {isEditingTarget ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempTarget}
                  onChange={e => setTempTarget(Number(e.target.value))}
                  className="w-12 px-1.5 py-0.5 rounded text-xs font-mono font-bold"
                  style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleSaveTarget}
                  className="px-2 py-0.5 rounded text-white text-[10px] font-bold"
                  style={{ background: 'var(--accent)' }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempTarget(settings.weeklyHoursTarget); setIsEditingTarget(true); }}
                className="font-mono font-bold flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
                title="Edit weekly goal"
              >
                <span>{settings.weeklyHoursTarget}h/wk target</span>
                <Settings2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}>
            <span>⏱️ Today</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
            {hoursToday}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>hrs</span>
          </div>
          <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>⚡ daily total</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--accent)' }}>
            <span>🎯 Week</span>
            <span className="font-mono font-bold">{percentAchieved}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
            {hoursThisWeek}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>/{settings.weeklyHoursTarget}h</span>
          </div>
          <div className="text-[10px] mt-1 font-mono font-semibold" style={{ color: 'var(--accent)' }}>
            {percentAchieved >= 100 ? '🎉 Target reached' : `⏳ ${hoursLeft}h left`}
          </div>
        </div>

        <div
          onClick={openStreakModal}
          className="card p-4 cursor-pointer select-none group transition-all"
          title="Click to manage, reset, or restore streak"
          style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}>
            <span className="group-hover:text-amber-500 transition-colors">🔥 Streak</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#f59e0b' }}>Edit ⚙</span>
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
            {streaks.currentStreak}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>days</span>
          </div>
          <div className="text-[10px] mt-1 font-mono flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--accent)' }}>🏆 Best: {streaks.longestStreak}d</span>
            <span className="text-[10px] font-semibold underline" style={{ color: 'var(--accent)' }}>Restore</span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}>
            <span>📚 Total</span>
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
            {totalAllTimeHours}<span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>hrs</span>
          </div>
          <div className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            {sessions.length} sessions logged
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Radial Ring */}
        <div className="lg:col-span-4 card p-5 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Target className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span>Weekly Goal Gauge</span>
          </span>

          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" stroke="var(--bg-card-alt)" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                strokeWidth="8.5" strokeLinecap="round"
                stroke="var(--accent)"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * percentAchieved) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
                {percentAchieved}%
              </span>
              <span className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {hoursThisWeek} of {settings.weeklyHoursTarget} hrs
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span>Paced: {hoursThisWeek}h</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }} />
              <span>Goal: {settings.weeklyHoursTarget}h</span>
            </div>
          </div>
        </div>

        {/* 7-Day Bar Chart */}
        <div className="lg:col-span-8 card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>Last 7 Days Pacing</span>
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Weekly Total: {hoursThisWeek}h</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4">
            {dailyHistory.map((day, idx) => {
              const heightPercent = maxDailyHour > 0 ? (day.hours / maxDailyHour) * 100 : 0;
              const isToday = idx === dailyHistory.length - 1;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold group-hover:text-amber-500 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    {day.hours > 0 ? `${day.hours}h` : '0'}
                  </span>

                  <div className="w-full max-w-[40px] rounded-t-xl overflow-hidden flex items-end h-28"
                    style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                    <div
                      className="w-full rounded-t-xl transition-all duration-500"
                      style={{
                        height: `${Math.max(6, heightPercent)}%`,
                        background: isToday ? 'var(--accent)' : 'var(--bg-card-alt)',
                        filter: isToday ? 'none' : 'brightness(0.8)',
                        backgroundColor: isToday ? 'var(--accent)' : '#94a3b8',
                      }}
                    />
                  </div>

                  <span className="text-[11px] font-mono font-bold"
                    style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] flex items-center justify-between pt-2 font-mono" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <span>Avg: {Math.round((hoursThisWeek / 7) * 10) / 10}h / day</span>
            <span className="text-emerald-500">🔥 Peak: {Math.max(...dailyHistory.map(d => d.hours))}h</span>
          </div>
        </div>
      </div>

      {/* ── Comprehensive Tag-Based Time Distribution Analysis ─────────── */}
      <div className="card p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20">
                <Hash className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Tag-Based Time Distribution
              </h3>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Quantitative allocation of your deep focus hours and task completion across all tags
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Filter Buttons */}
            <div className="flex items-center rounded-xl p-1 border text-xs" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}>
              {[
                { id: 'all', label: 'All Time' },
                { id: '30d', label: '30 Days' },
                { id: '7d', label: '7 Days' },
                { id: 'today', label: 'Today' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    Haptics.tap();
                    setTagTimeRange(f.id as any);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    tagTimeRange === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="px-3 py-1 rounded-xl text-xs font-mono font-bold border" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
              {totalTagPeriodHours}h {tagTimeRange === 'today' ? 'today' : 'logged'}
            </div>
          </div>
        </div>

        {/* Multi-color Tag Distribution Bar */}
        {tagBreakdown.length > 0 && totalTagPeriodHours > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Proportional Time Allocation</span>
              <span>{tagBreakdown.filter(t => t.hours > 0).length} active tags</span>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              {tagBreakdown.filter(t => t.hours > 0).map(item => (
                <div
                  key={item.id}
                  title={`#${item.name}: ${item.hours}h (${item.percentage}%)`}
                  className="h-full transition-all hover:opacity-85 cursor-pointer relative group"
                  style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Tag Cards & Velocity Breakdown */}
        {tagBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tagBreakdown.map(item => {
              const maxTagHours = Math.max(...tagBreakdown.map(t => t.hours), 1);
              const relativeWidth = Math.min(100, Math.round((item.hours / maxTagHours) * 100));

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl flex flex-col justify-between gap-3 border transition-all hover:shadow-sm"
                  style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm select-none">{item.icon || '🏷️'}</span>
                        <span className="font-bold text-xs truncate" style={{ color: item.color }}>
                          #{item.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {item.hours}h <span className="text-[10px] font-normal text-slate-400">({item.percentage}%)</span>
                      </span>
                    </div>

                    {/* Relative volume progress meter */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${relativeWidth}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>✓ {item.doneCount}/{item.taskCount} tasks done</span>
                      <span>{item.sessionsCount} sessions</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.avgMinutesPerTask > 0 ? `⚡ ~${item.avgMinutesPerTask}m / task` : 'Ready to sprint'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          Haptics.tap();
                          const candidate = topics.find(t => (t.tags && t.tags.includes(item.id)) || t.subjectId === item.id);
                          if (candidate) setActiveFocusTopic(candidate);
                          setActiveTab('timer');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-600 hover:bg-blue-600/10 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Focus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Hash className="w-8 h-8 text-slate-400" />
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No tags created yet</h4>
            <p className="text-xs max-w-sm" style={{ color: 'var(--text-muted)' }}>
              Type <strong>#tag</strong> in any card title to automatically create tags and analyze your time distribution here.
            </p>
          </div>
        )}
      </div>

      {/* ── Efficiency & Work Patterns ───── */}
      <div
        className="card p-5 space-y-4"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center gap-2.5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Efficiency & Focus Distribution
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Quantitative breakdown of your deep work habits and domain velocity
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl flex flex-col gap-1" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Deep Focus Ratio</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-emerald-500">{deepWorkRatio}%</span>
              <span className="text-[11px] text-slate-400">sessions &ge; 25m</span>
            </div>
            <p className="text-[10px] text-slate-400">Ratio of long uninterrupted focus sprints</p>
          </div>

          <div className="p-3 rounded-xl flex flex-col gap-1" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Primary Domain Velocity</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-blue-600">
                #{tagBreakdown[0]?.name || 'dev'}
              </span>
              <span className="text-[11px] text-slate-400">({tagBreakdown[0]?.percentage || 0}%)</span>
            </div>
            <p className="text-[10px] text-slate-400">Largest time concentration this week</p>
          </div>

          <div className="p-3 rounded-xl flex flex-col gap-1" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase text-slate-400">Experience & Level</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-amber-500">Lvl {userGamification.level}</span>
              <span className="text-[11px] font-semibold text-slate-500">{userGamification.levelTitle}</span>
            </div>
            <p className="text-[10px] text-slate-400">{userGamification.xp} total XP accumulated</p>
          </div>
        </div>
      </div>

      {/* ── Rust-Grade Data Safety & JSON Backup Console ─────── */}
      <div
        className="card p-5 space-y-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Zero Data Loss Storage Engine (V2 Schema Active)
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Immutable automated snapshots are preserved before updates. Export or restore your entire data anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                Haptics.tap();
                exportBackup();
              }}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
              title="Download complete JSON backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
              title="Restore data from JSON backup"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Restore Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </div>
        </div>

        {backupStatusMessage && (
          <div className="p-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            {backupStatusMessage}
          </div>
        )}
      </div>

      {/* Activity Heatmap */}
      <div className="card p-5 space-y-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>{heatmapRange === '30days' ? '30-Day Activity Heatmap' : '365-Day Annual Study Matrix'}</span>
            </span>

            <div className="flex items-center p-0.5 rounded-xl text-[10px] font-bold"
              style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setHeatmapRange('30days')}
                className="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                style={{
                  background: heatmapRange === '30days' ? 'var(--accent)' : 'transparent',
                  color: heatmapRange === '30days' ? '#fff' : 'var(--text-muted)',
                }}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setHeatmapRange('yearly')}
                className="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  background: heatmapRange === 'yearly' ? 'var(--accent)' : 'transparent',
                  color: heatmapRange === 'yearly' ? '#fff' : 'var(--text-muted)',
                }}
              >
                <CalendarRange className="w-3 h-3" />
                <span>365 Days</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            <span>0h</span>
            <span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }} />
            <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(12, 102, 228, 0.2)' }} />
            <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(12, 102, 228, 0.45)' }} />
            <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(12, 102, 228, 0.7)' }} />
            <span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--accent)' }} />
            <span>4h+</span>
          </div>
        </div>

        {/* 30-Day Grid */}
        {heatmapRange === '30days' && (
          <div className="space-y-3">
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5 pt-1">
              {heatmapDays.map(day => (
                <div
                  key={day.date}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredDay({ date: day.date, hours: day.hours, x: rect.left + rect.width / 2, y: rect.top - 8 });
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => { Haptics.tap(); setSelectedDate(day.date); }}
                  className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-mono cursor-pointer transition-transform hover:scale-125 hover:z-20 active:scale-95"
                  style={{ background: getHeatCell30(day.hours), border: '1px solid rgba(0,0,0,0.05)' }}
                >
                  <span style={{ color: day.hours > 0 ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{day.dayNum}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] flex items-center justify-between font-mono pt-1" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent)' }}>💡 Hover for hours studied, click any day to inspect completed tasks</span>
              <span>Last 30 days</span>
            </div>
          </div>
        )}

        {/* 365-Day Matrix */}
        {heatmapRange === 'yearly' && (
          <div className="space-y-3 pt-1">
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div className="inline-block min-w-full">
                {/* Month headers */}
                <div className="flex text-[9px] font-mono mb-1 ml-6 select-none" style={{ color: 'var(--text-muted)' }}>
                  {yearlyWeeks.map((week, idx) => {
                    const isFirstWeekOfMonth = idx === 0 || week[0].month !== yearlyWeeks[idx - 1][0].month;
                    return (
                      <div key={idx} className="w-3 sm:w-3.5 flex-shrink-0 text-center">
                        {isFirstWeekOfMonth && (
                          <span className="text-[9px] font-semibold" style={{ color: 'var(--accent)' }}>{week[0].month}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex">
                  <div className="flex flex-col justify-between text-[8px] font-mono mr-2 select-none py-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                    <span>Sun</span>
                  </div>

                  <div className="flex gap-[3px]">
                    {yearlyWeeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3px]">
                        {week.map(day => {
                          if (day.isFuture) {
                            return (
                              <div
                                key={day.date}
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] opacity-25"
                                style={{ background: 'var(--bg-card-alt)', border: '1px dashed var(--border)' }}
                              />
                            );
                          }

                          return (
                            <div
                              key={day.date}
                              onMouseEnter={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredDay({ date: day.date, hours: day.hours, x: rect.left + rect.width / 2, y: rect.top - 8 });
                              }}
                              onMouseLeave={() => setHoveredDay(null)}
                              onClick={() => { Haptics.tap(); setSelectedDate(day.date); }}
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] transition-transform hover:scale-150 hover:z-20 cursor-pointer active:scale-90"
                              style={{ background: getHeatCellYearly(day.hours), border: '1px solid rgba(0,0,0,0.05)' }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Active Days', value: `${yearlyActiveDays} / 365`, color: 'var(--accent)' },
                { label: 'Yearly Total', value: `${yearlyTotalHours}h`, color: '#10b981' },
                { label: 'Current Streak', value: `🔥 ${streaks.currentStreak}d`, color: '#f59e0b' },
                { label: 'Single Day Best', value: `⚡ ${maxYearlyDay}h`, color: 'var(--accent)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2.5 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-mono font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl text-xs animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: Math.max(80, Math.min(window.innerWidth - 80, hoveredDay.x)),
            top: Math.max(40, hoveredDay.y),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="font-bold text-[11px]" style={{ color: 'var(--accent)' }}>
            {new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="text-[12px] font-mono font-extrabold flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-primary)' }}>
            <span className={`w-2 h-2 rounded-full ${hoveredDay.hours > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span>{hoveredDay.hours > 0 ? `${hoveredDay.hours} hours studied` : '0 hours studied'}</span>
          </div>
          <div className="text-[9px] mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <span>👉 Click to view completed tasks & details</span>
          </div>
        </div>
      )}

      {/* Day Inspector Modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] rounded-2xl p-5 sm:p-6 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold block" style={{ color: 'var(--accent)' }}>
                    Day Activity Inspector
                  </span>
                  <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-xl transition-colors cursor-pointer"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 rounded-xl flex items-center justify-between"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Studied</span>
                <span className="font-mono font-black text-base text-emerald-500">{selectedDayHours} hrs</span>
              </div>
              <div className="p-3 rounded-xl flex items-center justify-between"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sessions</span>
                <span className="font-mono font-black text-base" style={{ color: 'var(--accent)' }}>{sessionsOnDate.length}</span>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin text-left">

              {/* Completed Topics */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Completed Topics & Tasks</span>
                  </h4>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {completedTopicsOnDate.length} completed
                  </span>
                </div>

                {completedTopicsOnDate.length > 0 ? (
                  <div className="space-y-2">
                    {completedTopicsOnDate.map(topic => {
                      const sub = subjects.find(s => s.id === topic.subjectId);
                      return (
                        <div key={topic.id} className="p-3 rounded-xl flex items-start justify-between gap-3 transition-colors"
                          style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                                {topic.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                {sub && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                                    style={{ backgroundColor: sub?.color || '#0d9488' }}>
                                    {sub.name}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {topic.completedHours || topic.approxHours || 1}h logged
                                </span>
                              </div>
                              {topic.notes && (
                                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{topic.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs"
                    style={{ background: 'var(--bg-card-alt)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                    No topics were marked as completed on this date.
                  </div>
                )}
              </div>

              {/* Sessions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>Study Sessions Logged</span>
                  </h4>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{sessionsOnDate.length} logged</span>
                </div>

                {sessionsOnDate.length > 0 ? (
                  <div className="space-y-1.5">
                    {sessionsOnDate.map(session => {
                      const sub = subjects.find(s => s.id === session.subjectId);
                      const topic = topics.find(t => t.id === session.topicId);
                      const mins = session.durationMinutes || Math.round((session.durationHours || 0) * 60);
                      return (
                        <div key={session.id} className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                          style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub?.color || 'var(--accent)' }} />
                            <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {topic?.name || sub?.name || 'Focus Session'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                              {session.mode === 'pomodoro' ? 'Pomodoro' : session.mode}
                            </span>
                            <span className="font-bold text-xs text-emerald-500">{mins}m</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs"
                    style={{ background: 'var(--bg-card-alt)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                    No timer sessions recorded on this date.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 mt-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  openAddTopicModal(selectedDate);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>+ Add Topic for this Date</span>
              </button>

              <button
                onClick={() => setSelectedDate(null)}
                className="btn-primary active:scale-95 transition-transform cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
