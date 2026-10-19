import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Topic, SUBJECT_PALETTE, GATE_STREAM_SYLLABUS, GATE_TASK_CATEGORIES, GateTaskCategory } from '../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  GraduationCap,
  Sparkles,
  Calendar,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const SubjectManager: React.FC = () => {
  const {
    subjects,
    topics,
    sessions,
    settings,
    addSubject,
    deleteSubject,
    setActiveFocusTopic,
    setActiveTab,
    deleteTopic,
    addTopic,
    toggleTopicCompletion,
    openRescheduleModal,
    loadGateStreamSyllabus
  } = useApp();

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Add Subject state
  const [newSubName, setNewSubName] = useState('');
  const [newSubColor, setNewSubColor] = useState(SUBJECT_PALETTE[0].hex);
  const [newSubHours, setNewSubHours] = useState(5);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Quick Add Topic per subject state: subjectId -> { name, hours, category, date }
  const [inlineTopicName, setInlineTopicName] = useState<Record<string, string>>({});
  const [inlineTopicHours, setInlineTopicHours] = useState<Record<string, number>>({});
  const [inlineTopicCat, setInlineTopicCat] = useState<Record<string, GateTaskCategory>>({});
  const [queuedFlash, setQueuedFlash] = useState<string | null>(null);

  const isGatePrep = Boolean(settings.isGatePrep);
  const todayStr = AnalyticsService.getTodayDateString();

  // Create subject quickly
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    const created = addSubject(newSubName.trim(), newSubColor, Number(newSubHours) || 5);
    setNewSubName('');
    setIsPaletteOpen(false);
    setExpandedSubjectId(created.id);
    Haptics.success();
  };

  // Add topic to a specific subject inline
  const handleAddTopicInline = async (subjectId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = inlineTopicName[subjectId]?.trim();
    if (!name) return;

    const approxHours = inlineTopicHours[subjectId] || 1.5;
    const category = inlineTopicCat[subjectId] || 'concept';

    await addTopic({
      subjectId,
      name,
      approxHours,
      category: isGatePrep ? category : undefined,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      status: 'todo',
      notes: ''
    });

    setInlineTopicName(prev => ({ ...prev, [subjectId]: '' }));
    Haptics.success();
  };

  // Quick queue high yield GATE topic
  const handleQueueHighYield = async (subjectId: string, topicTitle: string, isPyq: boolean) => {
    const fullTitle = isPyq ? `${topicTitle} (PYQ Drill)` : `${topicTitle} (Concept)`;
    await addTopic({
      subjectId,
      name: fullTitle,
      category: isPyq ? 'pyq' : 'concept',
      approxHours: 1.5,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      status: 'todo',
      notes: 'High-yield GATE topic'
    });
    setQueuedFlash(`${subjectId}:${topicTitle}`);
    setTimeout(() => setQueuedFlash(null), 1600);
    Haptics.success();
  };

  const getSubjectHours = (subjectId: string) => {
    const subSessions = sessions.filter(s => s.subjectId === subjectId);
    const total = subSessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0);
    return Math.round(total * 10) / 10;
  };

  const startFocusOnTopic = (topic: Topic) => {
    Haptics.tap();
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTasks = topics.length;
  const completedTasks = topics.filter(t => t.status === 'completed').length;
  const totalHoursInvested = Math.round(sessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0) * 10) / 10;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 pb-28 space-y-4">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>{isGatePrep ? 'Syllabus & Subjects' : 'Subjects & Topics'}</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Organize study subjects, track task completion, and queue high-priority topics.
          </p>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            📚 {subjects.length} Subjects
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            ✓ {completedTasks}/{totalTasks} Tasks Done
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
            ⏱️ {totalHoursInvested}h Studied
          </span>
        </div>
      </div>

      {/* ── GATE Syllabus Stream Presets (if GATE Mode) ──── */}
      {isGatePrep && (
        <div className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Quick Load Official Syllabus:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(GATE_STREAM_SYLLABUS).map(([streamKey, streamData]) => {
              const isActive = (settings.gateTargetStream || 'CSE') === streamKey;
              return (
                <button
                  key={streamKey}
                  type="button"
                  onClick={() => {
                    if (topics.length > 0 && !confirm(`Load ${streamData.label} subjects? This will add any missing stream subjects.`)) return;
                    loadGateStreamSyllabus(streamKey, false);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
                  style={{
                    background: isActive ? 'var(--accent)' : 'var(--bg-card-alt)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  🎓 {streamData.label.replace('GATE ', '')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fast Inline Quick-Add Subject Bar ─────────────── */}
      <form
        onSubmit={handleCreateSubject}
        className="p-2 sm:p-2.5 rounded-xl flex flex-wrap items-center gap-2 transition-all"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
            style={{ backgroundColor: newSubColor }}
            title="Click to change subject color"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white opacity-80" />
          </button>

          {/* Quick Color Dropdown */}
          {isPaletteOpen && (
            <div
              className="absolute left-0 top-10 z-30 p-2 rounded-xl grid grid-cols-5 gap-1.5 shadow-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              {SUBJECT_PALETTE.slice(0, 15).map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => { setNewSubColor(c.hex); setIsPaletteOpen(false); }}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          required
          placeholder="+ Add a new subject (e.g. Operating Systems, Algorithms)..."
          value={newSubName}
          onChange={e => setNewSubName(e.target.value)}
          className="input-base flex-1 min-w-[200px] text-xs py-1.5 font-medium"
        />

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <span className="text-[10px] text-slate-400">Goal:</span>
            <input
              type="number"
              min="1"
              max="60"
              value={newSubHours}
              onChange={e => setNewSubHours(Number(e.target.value) || 1)}
              className="w-8 bg-transparent font-bold text-center text-xs outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="text-[10px] text-slate-400">h/wk</span>
          </div>

          <button
            type="submit"
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </div>
      </form>

      {/* ── Search Bar (if more than 3 subjects) ──────────── */}
      {subjects.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 opacity-50" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search subjects or syllabus..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-base w-full pl-8 py-1.5 text-xs"
          />
        </div>
      )}

      {/* ── Subjects List ─────────────────────────────────── */}
      {subjects.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No subjects added yet</h3>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add your first subject using the bar above, or load an official syllabus preset.
          </p>
          {isGatePrep && (
            <button
              onClick={() => loadGateStreamSyllabus('CSE', true)}
              className="btn-primary text-xs px-4 py-2"
            >
              🎓 Load GATE CSE 2027 Syllabus
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubjects.map(subject => {
            const isExpanded = expandedSubjectId === subject.id;
            const subjectTopics = topics.filter(t => t.subjectId === subject.id);
            const hoursInvested = getSubjectHours(subject.id);
            const doneCount = subjectTopics.filter(t => t.status === 'completed').length;
            const pctDone = subjectTopics.length > 0 ? Math.round((doneCount / subjectTopics.length) * 100) : 0;

            const curTopicName = inlineTopicName[subject.id] || '';
            const curTopicHours = inlineTopicHours[subject.id] || 1.5;
            const curTopicCat = inlineTopicCat[subject.id] || 'concept';

            return (
              <div
                key={subject.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${subject?.color || '#0d9488'}`,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Subject Header Row */}
                <div
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                  className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color || '#0d9488' }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {subject.name}
                        </h3>
                        {subject.examWeightageMarks && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            🎯 {subject.examWeightageMarks}M
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 dark:bg-slate-800">
                          {subjectTopics.length} tasks
                        </span>
                      </div>

                      {/* Progress bar and hours */}
                      <div className="flex items-center gap-3 text-[11px] mt-1 font-mono text-slate-500">
                        <span>⏱️ {hoursInvested}h studied</span>
                        <span>•</span>
                        <span>{doneCount}/{subjectTopics.length} done ({pctDone}%)</span>
                        {subject.weeklyTargetHours && (
                          <>
                            <span>•</span>
                            <span>Goal: {subject.weeklyTargetHours}h/wk</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete "${subject.name}" and its tasks?`)) {
                          deleteSubject(subject.id);
                        }
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content: High-Yield Presets & Tasks */}
                {isExpanded && (
                  <div
                    className="p-3 sm:p-4 space-y-3.5 border-t"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg-app)'
                    }}
                  >
                    {/* High Yield GATE Chips (1-click queue) */}
                    {isGatePrep && subject.highYieldTopics && subject.highYieldTopics.length > 0 && (
                      <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-1 mb-1.5">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            High-Yield Topics (1-Click Queue)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.highYieldTopics.map(hy => {
                            const isFlashed = queuedFlash === `${subject.id}:${hy}`;
                            return (
                              <div
                                key={hy}
                                className="inline-flex items-center rounded-md overflow-hidden text-[11px]"
                                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
                              >
                                <span className="px-2 py-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>{hy}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQueueHighYield(subject.id, hy, false)}
                                  className="px-1.5 py-0.5 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 transition-colors cursor-pointer border-l"
                                  style={{ borderColor: 'var(--border)' }}
                                  title="Queue Concept Study for Today"
                                >
                                  +📖 Concept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQueueHighYield(subject.id, hy, true)}
                                  className="px-1.5 py-0.5 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 transition-colors cursor-pointer border-l"
                                  style={{ borderColor: 'var(--border)' }}
                                  title="Queue 25 PYQ Drill for Today"
                                >
                                  {isFlashed ? '✓ Added' : '+📝 PYQ'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Easy Inline Add Topic Input ───────────────── */}
                    <form
                      onSubmit={e => handleAddTopicInline(subject.id, e)}
                      className="p-2 rounded-lg flex flex-wrap items-center gap-2"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <input
                        type="text"
                        placeholder={`+ Add a topic or task to ${subject.name}...`}
                        value={curTopicName}
                        onChange={e => setInlineTopicName({ ...inlineTopicName, [subject.id]: e.target.value })}
                        className="input-base flex-1 min-w-[180px] text-xs py-1"
                      />

                      {/* Hours pill */}
                      <select
                        value={curTopicHours}
                        onChange={e => setInlineTopicHours({ ...inlineTopicHours, [subject.id]: parseFloat(e.target.value) || 1.5 })}
                        className="input-base text-xs py-1 px-2"
                        title="Estimated Hours"
                      >
                        <option value={0.5}>0.5h</option>
                        <option value={1.0}>1.0h</option>
                        <option value={1.5}>1.5h</option>
                        <option value={2.0}>2.0h</option>
                        <option value={3.0}>3.0h</option>
                        <option value={4.0}>4.0h</option>
                      </select>

                      {/* Category Pill (if GATE) */}
                      {isGatePrep && (
                        <select
                          value={curTopicCat}
                          onChange={e => setInlineTopicCat({ ...inlineTopicCat, [subject.id]: e.target.value as GateTaskCategory })}
                          className="input-base text-xs py-1 px-2"
                          title="Category"
                        >
                          <option value="concept">📖 Concept</option>
                          <option value="pyq">📝 PYQs</option>
                          <option value="mock">🧪 Mock</option>
                          <option value="revision">🔁 Revision</option>
                          <option value="notes">📓 Notes</option>
                        </select>
                      )}

                      <button
                        type="submit"
                        disabled={!curTopicName.trim()}
                        className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </form>

                    {/* Topic Cards List */}
                    {subjectTopics.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1 text-center">
                        No tasks queued for this subject yet. Type a topic name above and press Add!
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {subjectTopics.map(topic => {
                          const isDone = topic.status === 'completed';
                          const catMeta = GATE_TASK_CATEGORIES[topic.category || 'concept'];

                          return (
                            <div
                              key={topic.id}
                              className="p-2 sm:p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                              style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                opacity: isDone ? 0.65 : 1,
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => toggleTopicCompletion(topic.id)}
                                  className="text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer flex-shrink-0"
                                  title={isDone ? 'Mark as incomplete' : 'Mark as done'}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="text-xs font-semibold truncate"
                                      style={{
                                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                                        textDecoration: isDone ? 'line-through' : 'none'
                                      }}
                                    >
                                      {topic.name}
                                    </span>
                                    {isGatePrep && catMeta && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                        {catMeta.emoji} {catMeta.label}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                                    <span>⏱️ {topic.approxHours}h</span>
                                    <span>•</span>
                                    <span>📅 {topic.scheduledDate}</span>
                                    {topic.assigneeName && (
                                      <>
                                        <span>•</span>
                                        <span className="text-blue-600 font-semibold">👤 {topic.assigneeName}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Task Action Buttons */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!isDone && (
                                  <button
                                    type="button"
                                    onClick={() => startFocusOnTopic(topic)}
                                    className="p-1 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                    title="Start Focus Timer on this topic"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openRescheduleModal(topic)}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                  title="Reschedule Date"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteTopic(topic.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
