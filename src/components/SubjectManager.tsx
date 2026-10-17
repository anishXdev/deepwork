import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Topic, SUBJECT_PALETTE, GATE_STREAM_SYLLABUS, GATE_TASK_CATEGORIES } from '../types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Check,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export const SubjectManager: React.FC = () => {
  const { 
    subjects, 
    topics, 
    sessions, 
    settings,
    addSubject, 
    deleteSubject, 
    openAddTopicModal, 
    openRescheduleModal, 
    setActiveFocusTopic, 
    setActiveTab,
    deleteTopic,
    addTopic,
    loadGateStreamSyllabus
  } = useApp();

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_PALETTE[0].hex);
  const [newSubjectWeeklyTarget, setNewSubjectWeeklyTarget] = useState(5);
  const [queuedTopicFlash, setQueuedTopicFlash] = useState<string | null>(null);

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const created = addSubject(newSubjectName.trim(), newSubjectColor, newSubjectWeeklyTarget);
    setNewSubjectName('');
    setIsCreatingSubject(false);
    setExpandedSubjectId(created.id);
  };

  const handleQuickQueueHighYield = async (subjectId: string, topicTitle: string, isPyq: boolean) => {
    const todayStr = AnalyticsService.getTodayDateString();
    const fullTitle = isPyq ? `${topicTitle} — 25 PYQ Drill` : `${topicTitle} — Concept & Notes`;
    await addTopic({
      subjectId,
      name: fullTitle,
      category: isPyq ? 'pyq' : 'concept',
      approxHours: 1.5,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      status: 'todo',
      notes: 'High-yield GATE syllabus topic'
    });
    setQueuedTopicFlash(`${subjectId}:${topicTitle}`);
    setTimeout(() => setQueuedTopicFlash(null), 1800);
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

  const isGatePrep = Boolean(settings.isGatePrep);
  const totalSyllabusMarks = subjects.reduce((acc, s) => acc + (s.examWeightageMarks || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ocean-600 dark:text-aqua-400" />
            <span>{isGatePrep ? 'GATE Syllabus & Weightages' : 'Curriculum Domains'}</span>
          </h1>
          <p className="text-xs text-ocean-700/80 dark:text-ocean-300/80 mt-0.5">
            {isGatePrep
              ? `Track official GATE subjects, mark weightages${totalSyllabusMarks > 0 ? ` (${totalSyllabusMarks}/100 Marks mapped)` : ''}, and high-yield topics.`
              : 'Manage your study subjects, target hours, and nested topics.'}
          </p>
        </div>

        <button
          onClick={() => setIsCreatingSubject(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isGatePrep ? '+ Custom Subject' : '+ Subject'}</span>
        </button>
      </div>

      {/* 1-Click Official GATE Stream Syllabus Preset Bar (Only in GATE Prep Mode) */}
      {isGatePrep && (
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Official GATE Stream Syllabus Presets
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Load complete subject weightages (100 Marks) & high-yield topics in 1 click
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(GATE_STREAM_SYLLABUS).map(([streamKey, streamData]) => {
              const isActiveStream = (settings.gateTargetStream || 'CSE') === streamKey;
              return (
                <button
                  key={streamKey}
                  type="button"
                  onClick={() => {
                    if (topics.length > 0) {
                      if (confirm(`Switch to ${streamData.label} syllabus? Click OK to replace default subjects, or Cancel.`)) {
                        loadGateStreamSyllabus(streamKey, true);
                      }
                    } else {
                      loadGateStreamSyllabus(streamKey, true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isActiveStream
                      ? 'bg-teal-500 text-white border-teal-400 shadow-sm'
                      : 'bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-teal-500/25 hover:border-teal-400'
                  }`}
                >
                  🎓 {streamData.label.replace('GATE ', '')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Subject Card */}
      {isCreatingSubject && (
        <form 
          onSubmit={handleCreateSubject}
          className="glass-card rounded-2xl p-5 border border-ocean-400/40 dark:border-ocean-700/50 mb-6 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-ocean-200/50 dark:border-ocean-900/50 pb-3">
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
                placeholder="e.g. Compiler Design, Discrete Mathematics..."
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-ocean-500 font-medium"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                {['DBMS', 'Compiler Design', 'Engineering Mathematics', 'Computer Networks', 'Operating Systems', 'General Aptitude'].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setNewSubjectName(name)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20 transition-colors"
                  >
                    + {name}
                  </button>
                ))}
              </div>
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
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-ocean-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Color Accent (20 Themes)
              </label>
              <span className="text-[10px] font-medium text-ocean-600 dark:text-ocean-400">
                {SUBJECT_PALETTE.find(c => c.hex === newSubjectColor)?.name || 'Selected'}
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2 p-2.5 rounded-xl bg-white/50 dark:bg-black/30 border border-ocean-200/40 dark:border-ocean-900/50">
              {SUBJECT_PALETTE.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setNewSubjectColor(c.hex)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                    newSubjectColor === c.hex 
                      ? 'scale-125 ring-2 ring-white shadow-lg' 
                      : 'hover:scale-110 opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {newSubjectColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />}
                </button>
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
              className="px-4 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-ocean-300 dark:border-ocean-800">
          <BookOpen className="w-10 h-10 text-ocean-400 mx-auto mb-3" />
          <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-1">No subjects created yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
            Load an official GATE syllabus above or create your own subject.
          </p>
          <button
            onClick={() => loadGateStreamSyllabus('CSE', true)}
            className="px-4 py-2 rounded-xl liquid-btn text-white text-xs font-bold"
          >
            🎓 Load GATE CS & IT Syllabus
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
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {subject.name}
                        </h3>
                        {isGatePrep && subject.examWeightageMarks && (
                          <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                            🎯 {subject.examWeightageMarks} Marks
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {subjectTopics.length} tasks
                        </span>
                      </div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        <span>⏱️ <strong className="text-ocean-600 dark:text-aqua-400">{hoursInvested}h</strong> invested</span>
                        <span>•</span>
                        <span>✓ {completedTopicsCount}/{subjectTopics.length} done</span>
                        {subject.weeklyTargetHours && (
                          <>
                            <span>•</span>
                            <span>📅 {subject.weeklyTargetHours}h/wk goal</span>
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
                      className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-abyss-950 hover:bg-ocean-500/10 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-ocean-200/50 dark:border-ocean-900/60 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Task</span>
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
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-ocean-200/40 dark:border-ocean-900/50 bg-slate-50/40 dark:bg-abyss-950/40 space-y-4">
                    
                    {/* High-Yield GATE Topics 1-Click Queue Chips (Only in GATE mode) */}
                    {isGatePrep && subject.highYieldTopics && subject.highYieldTopics.length > 0 && (
                      <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-teal-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-600 dark:text-teal-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>High-Yield GATE Topics (Click to Queue for Today)</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.highYieldTopics.map(hy => {
                            const isFlashed = queuedTopicFlash === `${subject.id}:${hy}`;
                            return (
                              <div key={hy} className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 overflow-hidden text-[11px]">
                                <span className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-200">
                                  {hy}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickQueueHighYield(subject.id, hy, false)}
                                  title="Queue Concept Study for Today"
                                  className="px-1.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-bold border-l border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  +📖
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickQueueHighYield(subject.id, hy, true)}
                                  title="Queue 25-PYQ Drill for Today"
                                  className="px-1.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold border-l border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  {isFlashed ? '✓ Queued' : '+📝 PYQ'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ocean-700/80 dark:text-ocean-300/80">
                          Queued & Completed Tasks ({subjectTopics.length})
                        </span>
                        <button
                          onClick={() => openAddTopicModal()}
                          className="text-xs font-bold text-ocean-600 dark:text-aqua-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Custom Task</span>
                        </button>
                      </div>

                      {subjectTopics.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          {isGatePrep
                            ? 'No tasks queued for this subject yet. Tap any High-Yield topic above (+📖 or +📝 PYQ) to queue it for today!'
                            : 'No tasks queued for this subject yet. Click "+ Custom Task" to add one.'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {subjectTopics.map(topic => {
                            const catMeta = GATE_TASK_CATEGORIES[topic.category || 'concept'];
                            return (
                              <div
                                key={topic.id}
                                className="p-3 rounded-xl bg-white/70 dark:bg-abyss-card/80 border border-ocean-200/40 dark:border-ocean-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${topic.status === 'completed' ? 'bg-emerald-500' : 'bg-ocean-500'}`} />
                                    {isGatePrep && catMeta && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${catMeta.bgClass}`}>
                                        {catMeta.emoji} {catMeta.label}
                                      </span>
                                    )}
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
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-abyss-950 hover:bg-ocean-500/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-ocean-200/40 dark:border-ocean-900/60"
                              >
                                🗓️ Reschedule
                              </button>
                              <button
                                onClick={() => startFocusOnTopic(topic)}
                                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg liquid-btn text-white text-[11px] font-bold"
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
                            );
                          })}
                        </div>
                      )}
                    </div>
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
