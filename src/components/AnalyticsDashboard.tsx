import React, { useState } from 'react';
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
  BookOpen
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const AnalyticsDashboard: React.FC = () => {
  const { 
    sessions, 
    subjects, 
    topics,
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

  // Hover Tooltip State
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    hours: number;
    x: number;
    y: number;
  } | null>(null);

  // Selected Day Click Inspection State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const hoursToday = AnalyticsService.getHoursStudiedToday(sessions);
  const hoursThisWeek = AnalyticsService.getHoursStudiedThisWeek(sessions, settings.weekStartsOnMonday);
  const hoursLeft = Math.max(0, Math.round((settings.weeklyHoursTarget - hoursThisWeek) * 10) / 10);
  const percentAchieved = Math.min(100, Math.round((hoursThisWeek / settings.weeklyHoursTarget) * 100));

  const subjectBreakdown = AnalyticsService.getSubjectHoursBreakdown(
    subjects,
    sessions,
    'all',
    settings.weekStartsOnMonday
  );

  const dailyHistory = AnalyticsService.getDailyHistory(sessions, 7);
  const maxDailyHour = Math.max(...dailyHistory.map(d => d.hours), 4);

  const totalAllTimeHours = Math.round(
    sessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0) * 10
  ) / 10;

  const handleSaveTarget = () => {
    if (tempTarget > 0) {
      updateSettings({ weeklyHoursTarget: tempTarget });
    }
    setIsEditingTarget(false);
  };

  // Generate 30-day heatmap data
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

  // Generate 52 weeks of days (364 days, 52 columns x 7 days)
  const getYearlyWeeks = () => {
    const weeks: { date: string; hours: number; month: string; isFuture: boolean }[][] = [];
    const today = new Date();
    const todayDayOfWeek = (today.getDay() + 6) % 7; // Mon = 0, Sun = 6
    
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

  // Compute selected day details for modal
  const selectedDayHours = selectedDate ? (streaks.activityHistory[selectedDate] || 0) : 0;
  const completedTopicsOnDate = selectedDate ? topics.filter(t => 
    t.status === 'completed' && 
    (t.updatedAt?.startsWith(selectedDate) || t.scheduledDate === selectedDate)
  ) : [];
  const sessionsOnDate = selectedDate ? sessions.filter(s => 
    s.startTime?.startsWith(selectedDate)
  ) : [];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-600 dark:text-aqua-400 shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span>Analytics & Pacing</span>
            </h1>
            <p className="text-xs text-ocean-700/80 dark:text-ocean-300/80">
              Visual pacing, study metrics & activity heatmap
            </p>
          </div>
        </div>

        {/* Target Settings */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="glass-card px-3 py-1.5 rounded-xl border border-ocean-200/50 dark:border-ocean-900/60 flex items-center space-x-2 text-xs">
            <Target className="w-3.5 h-3.5 text-ocean-600 dark:text-aqua-400" />
            {isEditingTarget ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempTarget}
                  onChange={e => setTempTarget(Number(e.target.value))}
                  className="w-12 px-1.5 py-0.5 rounded bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-xs font-mono font-bold"
                />
                <button
                  onClick={handleSaveTarget}
                  className="px-2 py-0.5 rounded liquid-btn text-white text-[10px] font-bold"
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempTarget(settings.weeklyHoursTarget);
                  setIsEditingTarget(true);
                }}
                className="font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-ocean-600 dark:hover:text-aqua-400 flex items-center gap-1 cursor-pointer"
                title="Edit weekly goal"
              >
                <span>{settings.weeklyHoursTarget}h/wk target</span>
                <Settings2 className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Symbol Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* KPI 1: Today */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>⏱️ Today</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
            {hoursToday}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">hrs</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
            <span>⚡ daily total</span>
          </div>
        </div>

        {/* KPI 2: Week */}
        <div className="glass-card rounded-2xl p-4 border border-ocean-200/50 dark:border-ocean-900/60">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80 mb-1">
            <span>🎯 Week</span>
            <span className="text-ocean-600 dark:text-aqua-400 font-mono font-bold">{percentAchieved}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
            {hoursThisWeek}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/{settings.weeklyHoursTarget}h</span>
          </div>
          <div className="text-[10px] text-ocean-600 dark:text-aqua-400 mt-1 font-mono font-semibold">
            {percentAchieved >= 100 ? '🎉 Target reached' : `⏳ ${hoursLeft}h left`}
          </div>
        </div>

        {/* KPI 3: Streak */}
        <div 
          onClick={openStreakModal}
          className="glass-card rounded-2xl p-4 border border-ocean-200/50 dark:border-ocean-900/60 cursor-pointer hover:border-amber-500/40 transition-all group select-none"
          title="Click to manage, reset, or restore streak"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span className="group-hover:text-amber-500 transition-colors">🔥 Streak</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Edit ⚙</span>
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
            {streaks.currentStreak}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">days</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono flex items-center justify-between">
            <span className="text-teal-600 dark:text-teal-300 font-bold">🏆 Best: {streaks.longestStreak}d</span>
            <span className="text-ocean-600 dark:text-aqua-400 text-[10px] font-semibold underline">Restore</span>
          </div>
        </div>

        {/* KPI 4: All-Time */}
        <div className="glass-card rounded-2xl p-4 border border-ocean-200/50 dark:border-ocean-900/60">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>📚 Total</span>
            <Clock className="w-3.5 h-3.5 text-aqua-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
            {totalAllTimeHours}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">hrs</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {sessions.length} sessions logged
          </div>
        </div>

      </div>

      {/* OVERVIEW GRAPHS */}
      <div className="space-y-6 animate-in fade-in">
        
        {/* Radial Target Ring + 7-Day Bar Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Radial Donut Progress Ring (4 cols) */}
          <div className="lg:col-span-4 glass-card rounded-2xl p-5 border border-ocean-200/50 dark:border-ocean-900/60 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80 mb-4 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-ocean-600 dark:text-aqua-400" />
              <span>Weekly Goal Gauge</span>
            </span>

            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="text-slate-200 dark:text-abyss-950"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#progressGradient)"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * percentAchieved) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {percentAchieved}%
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {hoursThisWeek} of {settings.weeklyHoursTarget} hrs
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Paced: {hoursThisWeek}h</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Goal: {settings.weeklyHoursTarget}h</span>
              </div>
            </div>
          </div>

          {/* 7-Day Bar Chart (8 cols) */}
          <div className="lg:col-span-8 glass-card rounded-2xl p-5 border border-ocean-200/50 dark:border-ocean-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-ocean-200/40 dark:border-ocean-900/50 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-ocean-600 dark:text-aqua-400" />
                <span>Last 7 Days Pacing</span>
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Weekly Total: {hoursThisWeek}h
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4">
              {dailyHistory.map((day, idx) => {
                const heightPercent = maxDailyHour > 0 ? (day.hours / maxDailyHour) * 100 : 0;
                const isToday = idx === dailyHistory.length - 1;

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-ocean-600 dark:group-hover:text-aqua-400 transition-colors">
                      {day.hours > 0 ? `${day.hours}h` : '0'}
                    </span>
                    
                    <div className="w-full max-w-[40px] bg-slate-200/80 dark:bg-abyss-950 rounded-t-xl overflow-hidden flex items-end h-28 border border-ocean-200/40 dark:border-ocean-900/50">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isToday
                            ? 'bg-gradient-to-t from-ocean-600 to-aqua-400 shadow-md shadow-ocean-500/20'
                            : 'bg-slate-400/80 dark:bg-slate-700/80 group-hover:bg-ocean-500/60'
                        }`}
                        style={{ height: `${Math.max(6, heightPercent)}%` }}
                      />
                    </div>

                    <span className={`text-[11px] font-mono font-bold ${
                      isToday ? 'text-ocean-600 dark:text-aqua-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-ocean-200/40 dark:border-ocean-900/50 pt-2 font-mono">
              <span>Avg: {Math.round((hoursThisWeek / 7) * 10) / 10}h / day</span>
              <span className="text-emerald-500">🔥 Peak: {Math.max(...dailyHistory.map(d => d.hours))}h</span>
            </div>
          </div>

        </div>

        {/* Subject Distribution Spectrum Graph */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-ocean-600 dark:text-aqua-400" />
              <span>Subject Spectrum Distribution</span>
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {subjects.length} Subjects
            </span>
          </div>

          {/* Segmented multi-color distribution bar */}
          <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-abyss-950 overflow-hidden flex border border-ocean-200/40 dark:border-ocean-900/50 shadow-inner">
            {subjectBreakdown.map(item => (
              <div
                key={item.subjectId}
                title={`${item.subjectName}: ${item.hours}h (${item.percentage}%)`}
                className="h-full transition-all hover:opacity-90 cursor-pointer"
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: item.color
                }}
              />
            ))}
          </div>

          {/* Symbol Legend items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {subjectBreakdown.map(item => (
              <div key={item.subjectId} className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-abyss-card/60 border border-ocean-200/40 dark:border-ocean-900/50 text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.subjectName}</span>
                </div>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300 ml-2">
                  {item.hours}h <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Heatmap Matrix: 30-Day or 365-Day Yearly */}
        <div className="glass-card rounded-2xl p-5 border border-ocean-200/50 dark:border-ocean-900/60 space-y-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ocean-200/40 dark:border-ocean-900/50 pb-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>{heatmapRange === '30days' ? '30-Day Activity Heatmap' : '365-Day Annual Study Matrix'}</span>
              </span>

              {/* Range Toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-abyss-950 border border-ocean-200/40 dark:border-ocean-900/60 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setHeatmapRange('30days')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    heatmapRange === '30days'
                      ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapRange('yearly')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    heatmapRange === 'yearly'
                      ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CalendarRange className="w-3 h-3" />
                  <span>365 Days (Yearly)</span>
                </button>
              </div>
            </div>

            {/* Intensity Legend */}
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
              <span>0h</span>
              <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-abyss-950 border border-slate-300 dark:border-slate-800" />
              <span className="w-2.5 h-2.5 rounded bg-teal-500/40" />
              <span className="w-2.5 h-2.5 rounded bg-teal-500" />
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span className="w-2.5 h-2.5 rounded bg-emerald-400 shadow-sm" />
              <span>4h+</span>
            </div>
          </div>

          {/* 30-Day Grid */}
          {heatmapRange === '30days' && (
            <div className="space-y-3">
              <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5 pt-1">
                {heatmapDays.map(day => {
                  let bgClass = 'bg-slate-200/70 dark:bg-abyss-950 text-slate-400 border border-transparent';
                  if (day.hours > 3.5) bgClass = 'bg-emerald-400 text-emerald-950 font-black shadow-sm';
                  else if (day.hours > 2) bgClass = 'bg-emerald-500 text-white font-bold';
                  else if (day.hours > 1) bgClass = 'bg-teal-500 text-white font-semibold';
                  else if (day.hours > 0) bgClass = 'bg-teal-500/40 text-teal-900 dark:text-teal-200 border border-teal-500/30';

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({
                          date: day.date,
                          hours: day.hours,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => {
                        Haptics.tap();
                        setSelectedDate(day.date);
                      }}
                      className={`aspect-square rounded-lg ${bgClass} flex items-center justify-center text-[9px] font-mono cursor-pointer transition-transform hover:scale-125 hover:z-20 active:scale-95`}
                    >
                      {day.dayNum}
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1">
                <span className="text-teal-500/80">💡 Hover for hours studied, click any day to inspect completed tasks</span>
                <span>Last 30 days</span>
              </div>
            </div>
          )}

          {/* 365-Day (52 Weeks) Annual Contribution Matrix */}
          {heatmapRange === 'yearly' && (
            <div className="space-y-3 pt-1">
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="inline-block min-w-full">
                  {/* Month headers row */}
                  <div className="flex text-[9px] font-mono text-slate-400 mb-1 ml-6 select-none">
                    {yearlyWeeks.map((week, idx) => {
                      const isFirstWeekOfMonth = idx === 0 || week[0].month !== yearlyWeeks[idx - 1][0].month;
                      return (
                        <div key={idx} className="w-3 sm:w-3.5 flex-shrink-0 text-center">
                          {isFirstWeekOfMonth && (
                            <span className="text-[9px] font-semibold text-ocean-600 dark:text-aqua-300">
                              {week[0].month}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Matrix with Day of Week row headers */}
                  <div className="flex">
                    <div className="flex flex-col justify-between text-[8px] font-mono text-slate-400 mr-2 select-none py-0.5">
                      <span>Mon</span>
                      <span>Wed</span>
                      <span>Fri</span>
                      <span>Sun</span>
                    </div>

                    {/* 52 Week Columns */}
                    <div className="flex gap-[3px]">
                      {yearlyWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-[3px]">
                          {week.map(day => {
                            if (day.isFuture) {
                              return (
                                <div
                                  key={day.date}
                                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] bg-slate-100/30 dark:bg-abyss-950/30 border border-dashed border-slate-200 dark:border-slate-800/40 opacity-30"
                                />
                              );
                            }

                            let cellBg = 'bg-slate-200/60 dark:bg-abyss-950 border border-slate-300/40 dark:border-slate-800/70';
                            if (day.hours > 4) {
                              cellBg = 'bg-emerald-400 shadow-sm shadow-emerald-400/50 border border-emerald-300';
                            } else if (day.hours > 2.5) {
                              cellBg = 'bg-emerald-500 border border-emerald-400';
                            } else if (day.hours > 1) {
                              cellBg = 'bg-teal-500 border border-teal-400';
                            } else if (day.hours > 0) {
                              cellBg = 'bg-teal-500/35 border border-teal-500/30';
                            }

                            return (
                              <div
                                key={day.date}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredDay({
                                    date: day.date,
                                    hours: day.hours,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8
                                  });
                                }}
                                onMouseLeave={() => setHoveredDay(null)}
                                onClick={() => {
                                  Haptics.tap();
                                  setSelectedDate(day.date);
                                }}
                                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] ${cellBg} transition-transform hover:scale-150 hover:z-20 cursor-pointer active:scale-90`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Yearly Stats Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-ocean-200/30 dark:border-ocean-900/40 text-xs">
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-ocean-200/30 dark:border-ocean-900/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Active Days</span>
                  <span className="font-mono font-bold text-ocean-600 dark:text-aqua-300">{yearlyActiveDays} / 365</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-ocean-200/30 dark:border-ocean-900/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Yearly Total</span>
                  <span className="font-mono font-bold text-emerald-500">{yearlyTotalHours}h</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-ocean-200/30 dark:border-ocean-900/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Current Streak</span>
                  <span className="font-mono font-bold text-amber-500">🔥 {streaks.currentStreak}d</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-ocean-200/30 dark:border-ocean-900/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Single Day Best</span>
                  <span className="font-mono font-bold text-teal-400">⚡ {maxYearlyDay}h</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Floating Hover Tooltip for Heatmap Cells */}
      {hoveredDay && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-slate-900/95 text-white border border-teal-500/40 shadow-xl shadow-black/60 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            left: Math.max(80, Math.min(window.innerWidth - 80, hoveredDay.x)), 
            top: Math.max(40, hoveredDay.y) 
          }}
        >
          <div className="font-bold text-[11px] text-teal-300">
            {new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="text-[12px] font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${hoveredDay.hours > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{hoveredDay.hours > 0 ? `${hoveredDay.hours} hours studied` : '0 hours studied'}</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
            <span>👉 Click to view completed tasks & details</span>
          </div>
        </div>
      )}

      {/* Day Details Modal: Inspect Completed Tasks and Sessions for that Day */}
      {selectedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedDate(null)}
        >
          <div 
            className="w-full max-w-lg max-h-[85vh] rounded-3xl border border-teal-500/35 bg-[#030a12]/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-6 flex flex-col relative overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-24 bg-teal-500/15 blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-teal-500/20 pb-3 mb-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                    Day Activity Inspector
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-teal-500/25 flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Studied</span>
                <span className="font-mono font-black text-base text-emerald-400">
                  {selectedDayHours} hrs
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-teal-500/25 flex items-center justify-between">
                <span className="text-xs text-slate-400">Sessions</span>
                <span className="font-mono font-black text-base text-cyan-400">
                  {sessionsOnDate.length}
                </span>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin relative z-10 text-left">
              
              {/* Section 1: Completed Topics & Tasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Completed Topics & Tasks</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {completedTopicsOnDate.length} completed
                  </span>
                </div>

                {completedTopicsOnDate.length > 0 ? (
                  <div className="space-y-2">
                    {completedTopicsOnDate.map(topic => {
                      const sub = subjects.find(s => s.id === topic.subjectId);
                      return (
                        <div
                          key={topic.id}
                          className="p-3 rounded-2xl bg-slate-900/80 border border-teal-500/20 hover:border-teal-500/40 transition-colors flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start space-x-2.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white tracking-tight truncate">
                                {topic.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                {sub && (
                                  <span 
                                    className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                                    style={{ backgroundColor: sub.color }}
                                  >
                                    {sub.name}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-400">
                                  {topic.completedHours || topic.approxHours || 1}h logged
                                </span>
                              </div>
                              {topic.notes && (
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                  {topic.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No topics were marked as completed on this date.
                  </div>
                )}
              </div>

              {/* Section 2: Study Sessions Logged */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Study Sessions Logged</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {sessionsOnDate.length} logged
                  </span>
                </div>

                {sessionsOnDate.length > 0 ? (
                  <div className="space-y-1.5">
                    {sessionsOnDate.map(session => {
                      const sub = subjects.find(s => s.id === session.subjectId);
                      const topic = topics.find(t => t.id === session.topicId);
                      const mins = session.durationMinutes || Math.round((session.durationHours || 0) * 60);
                      return (
                        <div
                          key={session.id}
                          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span 
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sub?.color || '#0d9488' }}
                            />
                            <span className="font-semibold text-slate-200 truncate">
                              {topic?.name || sub?.name || 'Focus Session'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 font-mono shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 text-[10px] font-bold">
                              {session.mode === 'pomodoro' ? 'Pomodoro' : session.mode}
                            </span>
                            <span className="text-emerald-400 font-bold text-xs">
                              {mins}m
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No timer sessions recorded on this date.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 mt-4 border-t border-teal-500/20 flex items-center justify-between gap-3 relative z-10">
              <button
                onClick={() => {
                  setSelectedDate(null);
                  openAddTopicModal(selectedDate);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>+ Add Topic for this Date</span>
              </button>

              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 rounded-xl liquid-btn text-white font-bold text-xs active:scale-95 transition-transform cursor-pointer"
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
