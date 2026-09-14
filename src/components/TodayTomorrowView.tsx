import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { SmartRecommendationBanner } from './SmartRecommendationBanner';
import { Topic, Subject } from '../types';
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
    toggleTopicCompletion, 
    setActiveFocusTopic, 
    setActiveTab, 
    openAddTopicModal, 
    openRescheduleModal,
    openCreateSubjectModal,
    deleteTopic 
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<PendingFilter>('today');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const todayStr = AnalyticsService.getTodayDateString();
  const tomorrowStr = AnalyticsService.getTomorrowDateString();

  // All pending topics (status !== 'completed')
  const allPendingTopics = topics.filter(t => t.status !== 'completed');
  const todayPendingTopics = topics.filter(t => t.scheduledDate <= todayStr && t.status !== 'completed');
  const tomorrowPendingTopics = topics.filter(t => t.scheduledDate === tomorrowStr && t.status !== 'completed');
  const completedTopics = topics.filter(t => t.status === 'completed');

  // Filter topics based on active tab and optional subject filter
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
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
            <span>Focus Queue</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pending topics and study tasks.
          </p>
        </div>

        {/* Action Buttons: Add Subject & Add Topic */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Add New Subject Button */}
          <button
            onClick={() => openCreateSubjectModal()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700/80 shadow-sm transition-all active:scale-95"
            title="Create a new study subject"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>+ Subject</span>
          </button>

          {/* Add Study Topic Button */}
          <button
            onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Topic</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Today's Pending / Tomorrow / All Pending / Completed */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
        
        {/* Timing Filters with Symbols */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveFilter('today')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'today'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
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
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
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
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
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

        {/* Optional Subject Filter Dropdown */}
        {subjects.length > 0 && (
          <div className="flex items-center space-x-2">
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="all">📚 All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Study Topics List */}
      {displayTopics.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 text-emerald-500 flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-slate-800">
            {activeFilter === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6 text-indigo-500" />}
          </div>
          <h3 className="text-slate-800 dark:text-slate-200 font-bold text-base mb-1">
            {activeFilter === 'today' && 'Queue is clear for today!'}
            {activeFilter === 'tomorrow' && 'Nothing planned for tomorrow.'}
            {activeFilter === 'all' && 'No pending topics.'}
            {activeFilter === 'completed' && 'No completed topics yet.'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mb-5 leading-relaxed">
            {activeFilter === 'today' && 'Add a new topic or plan ahead for tomorrow.'}
            {activeFilter === 'tomorrow' && 'Schedule topics for tomorrow to hit the ground running.'}
            {activeFilter === 'all' && 'Add your curriculum topics to begin studying.'}
            {activeFilter === 'completed' && 'Complete study sessions to fill your achievements.'}
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
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
                        <span className="flex items-center text-[10px] font-mono text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-bold">
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
                          <div className="flex-1 bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-300/60 dark:border-slate-800">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${progressPercent}%`,
                                backgroundColor: subject?.color || '#6366f1'
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
                        className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300/80 dark:border-slate-800 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Reschedule Button */}
                    <button
                      onClick={() => openRescheduleModal(topic)}
                      title="Reschedule"
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300/80 dark:border-slate-800 transition-colors"
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>🗓️</span>
                    </button>

                    {/* Start Pomodoro Focus Button */}
                    {!isCompleted && (
                      <button
                        onClick={() => startFocusOnTopic(topic)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all active:scale-95"
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
