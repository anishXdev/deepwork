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
  Network,
  Play,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Hourglass
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { 
    sessions, 
    subjects, 
    topics,
    settings, 
    updateSettings, 
    streaks,
    setActiveFocusTopic,
    setActiveTab
  } = useApp();

  const [activeViewMode, setActiveViewMode] = useState<'overview' | 'tree'>('overview');
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(settings.weeklyHoursTarget);
  const [expandedSubjectTree, setExpandedSubjectTree] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    subjects.forEach(s => { init[s.id] = true; });
    return init;
  });

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

  const toggleSubjectTreeNode = (id: string) => {
    setExpandedSubjectTree(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startTopicFocus = (topic: any) => {
    setActiveFocusTopic(topic);
    setActiveTab('timer');
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

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-6">
      
      {/* Header with Switcher: Graphs Overview vs Knowledge Tree */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-sm">
            {activeViewMode === 'overview' ? <BarChart3 className="w-5 h-5" /> : <Network className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span>{activeViewMode === 'overview' ? 'Analytics & Graphs' : 'Curriculum Tree'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeViewMode === 'overview' ? 'Visual pacing, graphs & activity metrics' : 'Hierarchical subject-topic knowledge tree'}
            </p>
          </div>
        </div>

        {/* Mode Switcher & Target Editor */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Switch View Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveViewMode('overview')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeViewMode === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Graphs</span>
            </button>
            <button
              onClick={() => setActiveViewMode('tree')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeViewMode === 'tree'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Tree Graph</span>
            </button>
          </div>

          {/* Quick Target Settings */}
          <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-slate-800 flex items-center space-x-2 text-xs">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            {isEditingTarget ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempTarget}
                  onChange={e => setTempTarget(Number(e.target.value))}
                  className="w-12 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
                />
                <button
                  onClick={handleSaveTarget}
                  className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold"
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
                className="font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-500 flex items-center gap-1"
                title="Edit weekly goal"
              >
                <span>{settings.weeklyHoursTarget}h/wk</span>
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
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>🎯 Week</span>
            <span className="text-indigo-500 font-mono font-bold">{percentAchieved}%</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
            {hoursThisWeek}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/{settings.weeklyHoursTarget}h</span>
          </div>
          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 font-mono font-semibold">
            {percentAchieved >= 100 ? '🎉 Target reached' : `⏳ ${hoursLeft}h left`}
          </div>
        </div>

        {/* KPI 3: Streak */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>🔥 Streak</span>
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
            {streaks.currentStreak}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">days</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            👑 Best: {streaks.longestStreak}d
          </div>
        </div>

        {/* KPI 4: All-Time */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            <span>📚 Total</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
            {totalAllTimeHours}<span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">hrs</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {sessions.length} sessions logged
          </div>
        </div>

      </div>

      {/* VIEW 1: OVERVIEW GRAPHS */}
      {activeViewMode === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Radial Target Ring + 7-Day Bar Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Radial Donut Progress Ring (4 cols) */}
            <div className="lg:col-span-4 glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                <span>Weekly Goal Gauge</span>
              </span>

              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-slate-200 dark:text-slate-800/90"
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
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
                    {percentAchieved}%
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {hoursThisWeek}h / {settings.weeklyHoursTarget}h
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <span>✓ {hoursThisWeek}h done</span>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <span>⏳ {hoursLeft}h left</span>
                </div>
              </div>
            </div>

            {/* 7-Day Activity Bar Graph (8 cols) */}
            <div className="lg:col-span-8 glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <span>7-Day Distribution Graph</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  ⚡ Σ {hoursThisWeek}h
                </span>
              </div>

              {/* Bar graph bars */}
              <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4">
                {dailyHistory.map((day, idx) => {
                  const heightPercent = maxDailyHour > 0 ? (day.hours / maxDailyHour) * 100 : 0;
                  const isToday = idx === dailyHistory.length - 1;

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                        {day.hours > 0 ? `${day.hours}h` : '0'}
                      </span>
                      
                      <div className="w-full max-w-[40px] bg-slate-200/80 dark:bg-slate-900 rounded-t-xl overflow-hidden flex items-end h-28 border border-slate-300/60 dark:border-slate-800">
                        <div
                          className={`w-full rounded-t-xl transition-all duration-500 ${
                            isToday
                              ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-400 dark:bg-slate-700 group-hover:bg-slate-500 dark:group-hover:bg-slate-600'
                          }`}
                          style={{ height: `${Math.max(6, heightPercent)}%` }}
                        />
                      </div>

                      <span className={`text-[11px] font-mono font-bold ${
                        isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/80 pt-2 font-mono">
                <span>Avg: {Math.round((hoursThisWeek / 7) * 10) / 10}h / day</span>
                <span className="text-emerald-500">🔥 Peak: {Math.max(...dailyHistory.map(d => d.hours))}h</span>
              </div>
            </div>

          </div>

          {/* Subject Distribution Spectrum Graph */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Subject Spectrum Distribution</span>
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {subjects.length} Subjects
              </span>
            </div>

            {/* Segmented multi-color distribution bar */}
            <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden flex border border-slate-300/60 dark:border-slate-800 shadow-inner">
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
                <div key={item.subjectId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
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

          {/* 30-Day Activity Heatmap Matrix */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>30-Day Activity Heatmap</span>
              </span>
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded bg-indigo-400/40" />
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>More</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5 pt-2">
              {heatmapDays.map(day => {
                let bgClass = 'bg-slate-200 dark:bg-slate-800/90';
                if (day.hours > 3) bgClass = 'bg-emerald-500 text-white';
                else if (day.hours > 1.5) bgClass = 'bg-indigo-500 text-white';
                else if (day.hours > 0) bgClass = 'bg-indigo-400/50 text-indigo-900 dark:text-indigo-100';

                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.hours}h studied`}
                    className={`aspect-square rounded-lg ${bgClass} flex items-center justify-center text-[9px] font-mono font-bold cursor-pointer transition-transform hover:scale-125 hover:z-10`}
                  >
                    {day.dayNum}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: KNOWLEDGE TREE GRAPH */}
      {activeViewMode === 'tree' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 space-y-6 animate-in fade-in">
          
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Curriculum Knowledge Tree
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Visual hierarchy connecting subjects, topics, and completed sessions.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done
              </span>
              <span className="flex items-center gap-1 text-indigo-500 font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Pending
              </span>
            </div>
          </div>

          {/* Hierarchical Visual Tree */}
          <div className="space-y-6 pl-2 sm:pl-4">
            
            {/* Tree Root Node */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Study Ecosystem
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-2">
                  (Root • {subjects.length} Subjects • {topics.length} Topics)
                </span>
              </div>
            </div>

            {/* Subject Branches */}
            <div className="border-l-2 border-slate-300 dark:border-slate-800 ml-4 pl-4 sm:pl-6 space-y-6">
              {subjects.map(subject => {
                const isExpanded = expandedSubjectTree[subject.id] ?? true;
                const subjectTopics = topics.filter(t => t.subjectId === subject.id);
                const subHours = AnalyticsService.getSubjectHoursBreakdown([subject], sessions)[0]?.hours || 0;
                const completedCount = subjectTopics.filter(t => t.status === 'completed').length;

                return (
                  <div key={subject.id} className="relative group/subj">
                    
                    {/* Horizontal connector line */}
                    <div className="absolute -left-4 sm:-left-6 top-4 w-4 sm:w-6 h-0.5 bg-slate-300 dark:bg-slate-800" />

                    {/* Subject Node Box */}
                    <div 
                      onClick={() => toggleSubjectTreeNode(subject.id)}
                      className="glass-card rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all select-none"
                      style={{ borderLeft: `4px solid ${subject.color}` }}
                    >
                      <div className="flex items-center space-x-3">
                        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {subject.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="font-bold text-indigo-500">{subHours}h invested</span>
                        <span className="text-slate-400">({completedCount}/{subjectTopics.length} done)</span>
                      </div>
                    </div>

                    {/* Topic Leaves */}
                    {isExpanded && (
                      <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-800 ml-4 sm:ml-6 pl-4 sm:pl-6 mt-3 space-y-2.5">
                        {subjectTopics.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-1">
                            No topics added yet under this subject branch.
                          </div>
                        ) : (
                          subjectTopics.map(topic => {
                            const isDone = topic.status === 'completed';
                            return (
                              <div
                                key={topic.id}
                                className="relative flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400/40 transition-all group/topic"
                              >
                                {/* Horizontal connector to leaf */}
                                <div className="absolute -left-4 sm:-left-6 top-1/2 w-4 sm:w-6 h-0.5 bg-slate-300 dark:border-slate-800" />

                                <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                      isDone ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-indigo-500 ring-2 ring-indigo-500/20'
                                    }`} 
                                  />
                                  <span className={`text-xs font-medium truncate ${
                                    isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {topic.name}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    ⏱️ {topic.approxHours}h
                                  </span>

                                  {!isDone && (
                                    <button
                                      onClick={() => startTopicFocus(topic)}
                                      className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-sm transition-transform active:scale-95"
                                      title="Start Pomodoro Focus"
                                    >
                                      <Play className="w-3 h-3 fill-white" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
