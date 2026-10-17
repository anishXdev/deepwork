import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { SmartRecommendationBanner } from './SmartRecommendationBanner';
import { Topic, Subject, GateTaskCategory, GATE_TASK_CATEGORIES } from '../types';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  CalendarClock, 
  BookOpen,
  CalendarDays,
  Sparkles,
  Trash2,
  Check,
  Zap
} from 'lucide-react';

type PendingFilter = 'today' | 'tomorrow' | 'all' | 'completed';

export const TodayTomorrowView: React.FC = () => {
  const { 
    topics, 
    subjects, 
    settings,
    toggleTopicCompletion, 
    setActiveFocusTopic, 
    setActiveTab, 
    openAddTopicModal, 
    openRescheduleModal,
    openCreateSubjectModal,
    deleteTopic,
    addTopic,
    addSubject
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
  const [activeFilter, setActiveFilter] = useState<PendingFilter>('today');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<GateTaskCategory | 'all'>('all');

  // Instant Quick-Add Task State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSubjectId, setQuickSubjectId] = useState(subjects[0]?.id || '');
  const [quickCategory, setQuickCategory] = useState<GateTaskCategory>('pyq');
  const [quickDate, setQuickDate] = useState<'today' | 'tomorrow'>('today');
  const [quickHours, setQuickHours] = useState<number>(1.5);
  const [isQuickAddingSubject, setIsQuickAddingSubject] = useState(false);
  const [quickNewSubjectName, setQuickNewSubjectName] = useState('');
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  const todayStr = AnalyticsService.getTodayDateString();
  const tomorrowStr = AnalyticsService.getTomorrowDateString();

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTitle.trim()) return;

    let targetSubjectId = quickSubjectId;
    if (!targetSubjectId && subjects.length > 0) {
      targetSubjectId = subjects[0].id;
    }

    if (!targetSubjectId) {
      const defSub = addSubject('General Study', '#14b8a6', 5);
      targetSubjectId = defSub.id;
    }

    const scheduledDate = quickDate === 'today' ? todayStr : tomorrowStr;

    await addTopic({
      name: quickTitle.trim(),
      subjectId: targetSubjectId,
      category: quickCategory,
      approxHours: quickHours,
      scheduledDate,
      scheduledTime: quickDate === 'today' ? '10:00' : '09:00',
      status: 'todo',
      notes: ''
    });

    setQuickTitle('');
    setQuickAddSuccess(true);
    setTimeout(() => setQuickAddSuccess(false), 2000);
  };

  const applyGateTemplate = (label: string, cat: GateTaskCategory, hours: number) => {
    const activeSub = subjects.find(s => s.id === (quickSubjectId || subjects[0]?.id));
    const subShort = activeSub ? activeSub.name.split('(')[0].split('&')[0].trim() : 'GATE';
    setQuickTitle(`${subShort}: ${label}`);
    setQuickCategory(cat);
    setQuickHours(hours);
  };

  const handleQuickCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNewSubjectName.trim()) return;
    const colors = ['#0d9488', '#06b6d4', '#14b8a6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    const chosenColor = colors[subjects.length % colors.length];
    const created = addSubject(quickNewSubjectName.trim(), chosenColor, 5);
    setQuickSubjectId(created.id);
    setQuickNewSubjectName('');
    setIsQuickAddingSubject(false);
  };

  // All pending topics (status !== 'completed')
  const allPendingTopics = topics.filter(t => t.status !== 'completed');
  const todayPendingTopics = topics.filter(t => t.scheduledDate <= todayStr && t.status !== 'completed');
  const tomorrowPendingTopics = topics.filter(t => t.scheduledDate === tomorrowStr && t.status !== 'completed');
  const completedTopics = topics.filter(t => t.status === 'completed');

  // Filter topics based on active tab and optional subject/category filter
  let displayTopics: Topic[] = [];
  if (activeFilter === 'today') {
    displayTopics = todayPendingTopics;
  } else if (activeFilter === 'tomorrow') {
    displayTopics = tomorrowPendingTopics;
  } else if (activeFilter === 'all') {
    displayTopics = allPendingTopics;
  } else {
    displayTopics = completedTopics;
  }

  if (selectedSubjectFilter !== 'all') {
    displayTopics = displayTopics.filter(t => t.subjectId === selectedSubjectFilter);
  }

  if (selectedCategoryFilter !== 'all') {
    displayTopics = displayTopics.filter(t => (t.category || 'concept') === selectedCategoryFilter);
  }

  const getSubject = (subjectId: string): Subject | undefined => {
    return subjects.find(s => s.id === subjectId);
  };

  const startFocusOnTopic = (topic: Topic) => {
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-6">
      
      {/* Smart recommendation at the top */}
      <SmartRecommendationBanner />

      {/* Header with Quick Actions: Add Task & Add Subject */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-ocean-500 ring-4 ring-ocean-500/20 animate-pulse" />
            <span>Focus Queue</span>
          </h1>
          <p className="text-xs text-ocean-700/80 dark:text-ocean-300/80 mt-0.5">
            Pending topics and study tasks.
          </p>
        </div>

        {/* Action Buttons: Add Subject & Add Topic */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Add New Subject Button */}
          <button
            onClick={() => openCreateSubjectModal()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-abyss-card/80 hover:bg-ocean-500/10 text-slate-700 dark:text-slate-200 text-xs font-bold border border-ocean-200/50 dark:border-ocean-900/60 shadow-sm transition-all active:scale-95"
            title="Create a new study subject"
          >
            <BookOpen className="w-3.5 h-3.5 text-ocean-600 dark:text-aqua-400" />
            <span>+ Subject</span>
          </button>

          {/* Add Study Topic Button */}
          <button
            onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Topic</span>
          </button>
        </div>
      </div>

      {/* Instant Quick-Add Task & Subject Bar */}
      <div className="glass-card p-3.5 sm:p-4 rounded-2xl border border-teal-500/25 shadow-lg space-y-2.5">
        <form onSubmit={handleQuickAdd} className="space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isGatePrep ? "⚡ Quick add GATE topic, PYQ drill, or mock test..." : "⚡ Quick add topic or task... (e.g. Read Chapter 4)"}
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="w-full pl-3 pr-20 py-2 rounded-xl bg-white/70 dark:bg-black/40 border border-teal-500/30 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-teal-600/50 dark:placeholder-teal-400/40 focus:outline-none focus:border-teal-400"
              />
              {quickAddSuccess && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> Added!
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-4 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all disabled:opacity-40 active:scale-95 shadow-md flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>

          {/* 1-Click GATE Quick-Add Templates & Category Pills (Only in GATE Prep Mode) */}
          {isGatePrep && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {/* GATE Task Category Selector Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => {
                  const cat = GATE_TASK_CATEGORIES[catKey];
                  const isSelected = quickCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setQuickCategory(catKey)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? `${cat.bgClass} shadow-sm scale-105`
                          : 'bg-white/40 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-transparent hover:border-teal-500/30'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* 1-Click GATE Quick Templates */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 mr-0.5 hidden sm:inline">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyGateTemplate('Solve 25 Last-10-Yr PYQs', 'pyq', 1.5)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/25 transition-colors cursor-pointer"
                >
                  + 25 PYQs
                </button>
                <button
                  type="button"
                  onClick={() => applyGateTemplate('Subject-Wise Test + Mistake Analysis', 'mock', 1.5)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/25 transition-colors cursor-pointer"
                >
                  + Subject Mock
                </button>
                <button
                  type="button"
                  onClick={() => applyGateTemplate('Full-Length 65-Q GATE Mock Test', 'mock', 3)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/25 transition-colors cursor-pointer"
                >
                  + Full 3h Mock
                </button>
                <button
                  type="button"
                  onClick={() => applyGateTemplate('Short Notes & Formula Revision', 'revision', 1)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25 transition-colors cursor-pointer"
                >
                  + Formula Rev
                </button>
              </div>
            </div>
          )}

          {/* Quick Selectors: Subject, Timing, Hours */}
          <div className={`flex flex-wrap items-center justify-between gap-2 pt-1 text-xs ${isGatePrep ? 'border-t border-teal-500/15' : ''}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Subject selector */}
              {isQuickAddingSubject ? (
                <div className="flex items-center gap-1 bg-white/80 dark:bg-black/50 p-1 rounded-xl border border-teal-500/40">
                  <input
                    type="text"
                    placeholder="New subject..."
                    value={quickNewSubjectName}
                    onChange={e => setQuickNewSubjectName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickCreateSubject(e);
                      } else if (e.key === 'Escape') {
                        setIsQuickAddingSubject(false);
                      }
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-xs bg-transparent border-none outline-none text-slate-800 dark:text-teal-100 placeholder-teal-400/50 w-28"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateSubject}
                    className="px-2 py-0.5 rounded-lg bg-teal-500 text-white text-[10px] font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingSubject(false)}
                    className="text-slate-400 hover:text-slate-200 px-1 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <select
                    value={quickSubjectId || (subjects[0]?.id || '')}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setIsQuickAddingSubject(true);
                      } else {
                        setQuickSubjectId(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/70 dark:bg-black/30 border border-teal-500/30 text-xs font-semibold text-slate-800 dark:text-teal-200 focus:outline-none cursor-pointer"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{isGatePrep && s.examWeightageMarks ? ` (${s.examWeightageMarks}M)` : ''}
                      </option>
                    ))}
                    <option value="__new__">+ New Subject...</option>
                  </select>
                </div>
              )}

              {/* Due Date Toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/60 dark:bg-black/30 border border-teal-500/25 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    quickDate === 'today' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-600 dark:text-teal-300/80 hover:text-teal-400'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('tomorrow')}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    quickDate === 'tomorrow' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-600 dark:text-teal-300/80 hover:text-teal-400'
                  }`}
                >
                  Tomorrow
                </button>
              </div>

              {/* Hour Pills */}
              <div className="flex items-center space-x-1">
                {[0.5, 1, 1.5, 2, 3].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setQuickHours(h)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      quickHours === h
                        ? 'bg-teal-500/20 text-teal-700 dark:text-teal-200 border border-teal-400/50 shadow-sm'
                        : 'bg-white/40 dark:bg-black/20 text-slate-500 dark:text-teal-400/60 hover:text-teal-300'
                    }`}
                  >
                    {h === 0.5 ? '30m' : `${h}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Modal Trigger Link */}
            <button
              type="button"
              onClick={() => openAddTopicModal(quickDate === 'tomorrow' ? tomorrowStr : todayStr)}
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>More options...</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs: Today's Pending / Tomorrow / All Pending / Completed */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean-200/40 dark:border-ocean-900/50 pb-3">
        
        {/* Timing Filters with Symbols */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-200/70 dark:bg-abyss-900/80 border border-ocean-200/40 dark:border-ocean-900/60 text-xs font-medium">
          <button
            onClick={() => setActiveFilter('today')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'today'
                ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡ Today</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'today' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {todayPendingTopics.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('tomorrow')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'tomorrow'
                ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🌅 Tomorrow</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'tomorrow' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {tomorrowPendingTopics.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>📋 All</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {allPendingTopics.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('completed')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>✓ Done</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {completedTopics.length}
            </span>
          </button>
        </div>

        {/* Optional Category & Subject Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {isGatePrep && (
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value as GateTaskCategory | 'all')}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ocean-500 font-bold"
            >
              <option value="all">🎯 All Prep Types</option>
              {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => (
                <option key={catKey} value={catKey}>
                  {GATE_TASK_CATEGORIES[catKey].emoji} {GATE_TASK_CATEGORIES[catKey].label}
                </option>
              ))}
            </select>
          )}

          {subjects.length > 0 && (
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ocean-500 font-bold"
            >
              <option value="all">📚 All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Study Topics List */}
      {displayTopics.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-dashed border-ocean-300 dark:border-ocean-800 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-ocean-500/10 text-ocean-600 dark:text-aqua-400 flex items-center justify-center mx-auto mb-3 border border-ocean-500/20">
            {activeFilter === 'completed' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Sparkles className="w-6 h-6 text-ocean-500" />}
          </div>
          <h3 className="text-slate-800 dark:text-slate-200 font-bold text-base mb-1">
            {activeFilter === 'today' && 'Queue is clear for today!'}
            {activeFilter === 'tomorrow' && 'Nothing planned for tomorrow.'}
            {activeFilter === 'all' && 'No pending topics.'}
            {activeFilter === 'completed' && 'No completed topics yet.'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mb-5 leading-relaxed">
            {activeFilter === 'today' && (isGatePrep ? 'Queue a PYQ sprint, concept study, or mock test above.' : 'Add a new topic or plan ahead for tomorrow.')}
            {activeFilter === 'tomorrow' && 'Schedule topics for tomorrow to hit the ground running.'}
            {activeFilter === 'all' && 'Add your curriculum topics to begin studying.'}
            {activeFilter === 'completed' && 'Complete study sessions to fill your achievements.'}
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)}
              className="px-4 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all"
            >
              + Add Topic
            </button>
            <button
              onClick={() => openCreateSubjectModal()}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            >
              + Subject
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTopics.map(topic => {
            const subject = getSubject(topic.subjectId);
            const isCompleted = topic.status === 'completed';
            const progressPercent = topic.approxHours > 0 
              ? Math.min(100, Math.round((topic.completedHours / topic.approxHours) * 100)) 
              : 0;
            const catMeta = GATE_TASK_CATEGORIES[topic.category || 'concept'];

            return (
              <div
                key={topic.id}
                className={`glass-card glass-card-hover rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 relative overflow-hidden transition-all group ${
                  isCompleted ? 'opacity-70 bg-slate-100/50 dark:bg-slate-900/40' : ''
                }`}
                style={{
                  borderLeft: `4px solid ${subject?.color || '#6366f1'}`
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Completion Checkbox & Topic Content */}
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTopicCompletion(topic.id)}
                      className={`mt-0.5 transition-colors flex-shrink-0 group/btn ${
                        isCompleted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'
                      }`}
                      title={isCompleted ? 'Mark pending' : 'Mark complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500/20 text-emerald-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 dark:border-slate-600 group-hover/btn:border-emerald-500 flex items-center justify-center transition-colors">
                          <Check className="w-3 h-3 text-transparent group-hover/btn:text-emerald-500 transition-colors" />
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {isGatePrep && catMeta && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${catMeta.bgClass}`}>
                            <span>{catMeta.emoji}</span>
                            <span>{catMeta.label}</span>
                          </span>
                        )}

                        {subject && (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border font-sans"
                            style={{
                              backgroundColor: `${subject.color}15`,
                              borderColor: `${subject.color}35`,
                              color: subject.color
                            }}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: subject.color }} 
                            />
                            {subject.name}
                            {isGatePrep && subject.examWeightageMarks ? ` (${subject.examWeightageMarks}M)` : ''}
                          </span>
                        )}

                        {/* Scheduled time badge */}
                        <span className="flex items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          {topic.scheduledDate === todayStr 
                            ? 'Today' 
                            : topic.scheduledDate === tomorrowStr 
                            ? 'Tomorrow' 
                            : topic.scheduledDate}
                          {topic.scheduledTime ? ` @ ${topic.scheduledTime}` : ''}
                        </span>

                        {/* Approx hours badge */}
                        <span className="flex items-center text-[10px] font-mono text-ocean-700 dark:text-aqua-300 bg-ocean-500/10 px-2 py-0.5 rounded-md border border-ocean-500/20 font-bold">
                          ⏱️ {topic.approxHours}h
                          {topic.completedHours > 0 && ` (${topic.completedHours}h done)`}
                        </span>
                      </div>

                      {/* Topic Title */}
                      <h3 className={`font-bold text-sm sm:text-base leading-snug tracking-tight text-slate-900 dark:text-slate-100 ${
                        isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}>
                        {topic.name}
                      </h3>

                      {topic.notes && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1">
                          {topic.notes}
                        </p>
                      )}

                      {/* Mini Progress Track if in progress */}
                      {topic.completedHours > 0 && !isCompleted && (
                        <div className="mt-1.5 flex items-center space-x-2 max-w-xs">
                          <div className="flex-1 bg-slate-200/80 dark:bg-abyss-950 rounded-full h-1.5 overflow-hidden border border-ocean-200/40 dark:border-ocean-900/50">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${progressPercent}%`,
                                backgroundColor: subject?.color || '#0d9488'
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            {progressPercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Calendar link, Reschedule, Start Pomodoro Focus */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-center flex-shrink-0">
                    
                    {/* Google Calendar Link */}
                    {topic.gcalLink && (
                      <a
                        href={topic.gcalLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Google Calendar"
                        className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-abyss-950 hover:bg-ocean-500/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-ocean-200/40 dark:border-ocean-900/50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Reschedule Button */}
                    <button
                      onClick={() => openRescheduleModal(topic)}
                      title="Reschedule"
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-abyss-950 hover:bg-ocean-500/10 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-ocean-200/40 dark:border-ocean-900/50 transition-colors"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>🗓️</span>
                    </button>

                    {/* Start Pomodoro Focus Button (Liquid Button) */}
                    {!isCompleted && (
                      <button
                        onClick={() => startFocusOnTopic(topic)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>▶ Focus</span>
                      </button>
                    )}

                    {/* Delete topic */}
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add for Tomorrow Banner (Shown when on Today's tab) */}
      {activeFilter === 'today' && (
        <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Plan for Tomorrow
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tomorrowPendingTopics.length} topic(s) queued.
              </p>
            </div>
          </div>

          <button
            onClick={() => openAddTopicModal(tomorrowStr)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add for Tomorrow</span>
          </button>
        </div>
      )}

    </div>
  );
};
