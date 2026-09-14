import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  Play, 
  CalendarClock, 
  ChevronDown, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#38bdf8', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

export const SubjectManager: React.FC = () => {
  const { 
    subjects, 
    topics, 
    sessions, 
    addSubject, 
    deleteSubject, 
    openAddTopicModal, 
    openRescheduleModal, 
    setActiveFocusTopic, 
    setActiveTab,
    deleteTopic
  } = useApp();

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(PRESET_COLORS[0]);
  const [newSubjectWeeklyTarget, setNewSubjectWeeklyTarget] = useState(5);

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const created = addSubject(newSubjectName.trim(), newSubjectColor, newSubjectWeeklyTarget);
    setNewSubjectName('');
    setIsCreatingSubject(false);
    setExpandedSubjectId(created.id);
  };

  const getSubjectHours = (subjectId: string) => {
    const subSessions = sessions.filter(s => s.subjectId === subjectId);
    const total = subSessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0);
    return Math.round(total * 10) / 10;
  };

  const startFocusOnTopic = (topic: Topic) => {
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span>Curriculum Domains</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your study subjects, target hours, and nested topics.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingSubject(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Subject</span>
        </button>
      </div>

      {/* Create Subject Card */}
      {isCreatingSubject && (
        <form 
          onSubmit={handleCreateSubject}
          className="glass-card rounded-2xl p-5 border border-indigo-500/30 mb-6 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Subject</h3>
            <button
              type="button"
              onClick={() => setIsCreatingSubject(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Distributed Systems, Machine Learning..."
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Target Hours/wk
              </label>
              <input
                type="number"
                min="1"
                max="80"
                step="0.5"
                value={newSubjectWeeklyTarget}
                onChange={e => setNewSubjectWeeklyTarget(parseFloat(e.target.value) || 1)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">
              Color Accent
            </label>
            <div className="flex items-center space-x-2.5">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewSubjectColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newSubjectColor === color ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingSubject(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-1">No subjects created yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
            Add your subjects to organize topics, hours, and schedules.
          </p>
          <button
            onClick={() => setIsCreatingSubject(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            + Create First Subject
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => {
            const isExpanded = expandedSubjectId === subject.id;
            const subjectTopics = topics.filter(t => t.subjectId === subject.id);
            const hoursInvested = getSubjectHours(subject.id);
            const completedTopicsCount = subjectTopics.filter(t => t.status === 'completed').length;

            return (
              <div
                key={subject.id}
                className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all"
              >
                {/* Subject Header row */}
                <div 
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-850 transition-colors select-none"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {subject.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {subjectTopics.length} topics
                        </span>
                      </div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        <span>⏱️ <strong className="text-indigo-600 dark:text-indigo-400">{hoursInvested}h</strong> invested</span>
                        <span>•</span>
                        <span>✓ {completedTopicsCount}/{subjectTopics.length}</span>
                        {subject.weeklyTargetHours && (
                          <>
                            <span>•</span>
                            <span>🎯 {subject.weeklyTargetHours}h/wk</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddTopicModal();
                      }}
                      className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Topic</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete subject "${subject.name}" and its topics?`)) {
                          deleteSubject(subject.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400 p-1">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Topics Container */}
                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-3 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Topics
                      </span>
                      <button
                        onClick={() => openAddTopicModal()}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Topic</span>
                      </button>
                    </div>

                    {subjectTopics.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No topics under this subject yet. Click "+ Add Topic" to plan what to study.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {subjectTopics.map(topic => (
                          <div
                            key={topic.id}
                            className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${topic.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                <span className={`text-xs sm:text-sm font-semibold ${topic.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {topic.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                <span className="flex items-center">
                                  ⏱️ {topic.approxHours}h (Done: {topic.completedHours}h)
                                </span>
                                <span>•</span>
                                <span className="flex items-center">
                                  📅 {topic.scheduledDate} {topic.scheduledTime ? `@ ${topic.scheduledTime}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 self-end sm:self-center">
                              {topic.gcalLink && (
                                <a
                                  href={topic.gcalLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Google Calendar"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => openRescheduleModal(topic)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-300 dark:border-slate-700"
                              >
                                🗓️ Reschedule
                              </button>
                              <button
                                onClick={() => startFocusOnTopic(topic)}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>Focus</span>
                              </button>
                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-slate-400 hover:text-red-500 px-1.5 py-1 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
