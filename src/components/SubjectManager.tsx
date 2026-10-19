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
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}>
            <BookOpen className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span>{isGatePrep ? 'GATE Syllabus & Weightages' : 'Subjects'}</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isGatePrep
              ? `Track official GATE subjects, mark weightages${totalSyllabusMarks > 0 ? ` (${totalSyllabusMarks}/100 Marks mapped)` : ''}, and high-yield topics.`
              : 'Manage your study subjects, target hours, and nested topics.'}
          </p>
        </div>

        <button
          onClick={() => setIsCreatingSubject(true)}
          className="btn-primary flex items-center gap-1.5 self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{isGatePrep ? '+ Custom Subject' : '+ Subject'}</span>
        </button>
      </div>

      {/* GATE Stream Preset Bar */}
      {isGatePrep && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)' }}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Official GATE Stream Syllabus Presets</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Load complete subject weightages (100 Marks) & high-yield topics in 1 click</p>
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
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  style={{
                    border: '1px solid var(--border)',
                    background: isActiveStream ? 'var(--accent)' : 'var(--bg-card-alt)',
                    color: isActiveStream ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  🎓 {streamData.label.replace('GATE ', '')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Subject Form */}
      {isCreatingSubject && (
        <form onSubmit={handleCreateSubject} className="card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add Subject</h3>
            <button
              type="button"
              onClick={() => setIsCreatingSubject(false)}
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Compiler Design, Discrete Mathematics..."
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                className="input-base w-full"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Quick suggestions:</span>
                {['DBMS', 'Compiler Design', 'Engineering Mathematics', 'Computer Networks', 'Operating Systems', 'General Aptitude'].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setNewSubjectName(name)}
                    className="text-[10px] px-2 py-0.5 rounded-md transition-colors"
                    style={{ background: 'rgba(180,83,9,0.08)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.2)' }}
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>Target Hours/wk</label>
              <input
                type="number"
                min="1"
                max="80"
                step="0.5"
                value={newSubjectWeeklyTarget}
                onChange={e => setNewSubjectWeeklyTarget(parseFloat(e.target.value) || 1)}
                className="input-base w-full font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>Color Accent (20 Themes)</label>
              <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
                {SUBJECT_PALETTE.find(c => c.hex === newSubjectColor)?.name || 'Selected'}
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2 p-2.5 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              {SUBJECT_PALETTE.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setNewSubjectColor(c.hex)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: c.hex,
                    transform: newSubjectColor === c.hex ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: newSubjectColor === c.hex ? '0 0 0 2px #fff, 0 0 0 3px ' + c.hex : 'none',
                    opacity: newSubjectColor === c.hex ? 1 : 0.7,
                  }}
                >
                  {newSubjectColor === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingSubject(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="card p-10 text-center" style={{ border: '1px dashed var(--border)' }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No subjects created yet</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Load an official GATE syllabus above or create your own subject.
          </p>
          <button
            onClick={() => loadGateStreamSyllabus('CSE', true)}
            className="btn-primary"
          >
            🎓 Load GATE CS & IT Syllabus
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(subject => {
            const isExpanded = expandedSubjectId === subject.id;
            const subjectTopics = topics.filter(t => t.subjectId === subject.id);
            const hoursInvested = getSubjectHours(subject.id);
            const completedTopicsCount = subjectTopics.filter(t => t.status === 'completed').length;

            return (
              <div
                key={subject.id}
                className="card overflow-hidden transition-all"
                style={{ borderLeft: `3px solid ${subject.color}` }}
              >
                {/* Subject Header */}
                <div
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-alt)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {subject.name}
                        </h3>
                        {isGatePrep && subject.examWeightageMarks && (
                          <span className="pill text-[10px]" style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.25)' }}>
                            🎯 {subject.examWeightageMarks} Marks
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {subjectTopics.length} tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span>⏱️ <strong style={{ color: 'var(--accent)' }}>{hoursInvested}h</strong> invested</span>
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); openAddTopicModal(); }}
                      className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: 'var(--bg-card-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Task</span>
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete subject "${subject.name}" and its topics?`)) {
                          deleteSubject(subject.id);
                        }
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div style={{ color: 'var(--text-muted)' }} className="p-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Topics */}
                {isExpanded && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card-alt)' }}>

                    {/* High-Yield GATE Chips */}
                    {isGatePrep && subject.highYieldTopics && subject.highYieldTopics.length > 0 && (
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-1 mb-2">
                          <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                            High-Yield GATE Topics (Click to Queue for Today)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.highYieldTopics.map(hy => {
                            const isFlashed = queuedTopicFlash === `${subject.id}:${hy}`;
                            return (
                              <div key={hy} className="inline-flex items-center rounded-lg overflow-hidden text-[11px]"
                                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                                <span className="px-2 py-1 font-semibold" style={{ color: 'var(--text-primary)' }}>{hy}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickQueueHighYield(subject.id, hy, false)}
                                  title="Queue Concept Study for Today"
                                  className="px-1.5 py-1 font-bold transition-colors cursor-pointer"
                                  style={{ borderLeft: '1px solid var(--border)', color: 'var(--accent)', background: 'rgba(180,83,9,0.07)' }}
                                >
                                  +📖
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickQueueHighYield(subject.id, hy, true)}
                                  title="Queue 25-PYQ Drill for Today"
                                  className="px-1.5 py-1 font-bold transition-colors cursor-pointer"
                                  style={{ borderLeft: '1px solid var(--border)', color: '#f59e0b', background: 'rgba(245,158,11,0.07)' }}
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
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Queued & Completed Tasks ({subjectTopics.length})
                        </span>
                        <button
                          onClick={() => openAddTopicModal()}
                          className="text-xs font-bold flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Custom Task</span>
                        </button>
                      </div>

                      {subjectTopics.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
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
                                className="p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${topic.status === 'completed' ? 'bg-emerald-500' : ''}`}
                                      style={{ backgroundColor: topic.status === 'completed' ? '#10b981' : subject.color }} />
                                    {isGatePrep && catMeta && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${catMeta.bgClass}`}>
                                        {catMeta.emoji} {catMeta.label}
                                      </span>
                                    )}
                                    <span className="text-xs sm:text-sm font-semibold"
                                      style={{ color: topic.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: topic.status === 'completed' ? 'line-through' : 'none' }}>
                                      {topic.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                    <span>⏱️ {topic.approxHours}h (Done: {topic.completedHours}h)</span>
                                    <span>•</span>
                                    <span>📅 {topic.scheduledDate} {topic.scheduledTime ? `@ ${topic.scheduledTime}` : ''}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  {topic.gcalLink && (
                                    <a
                                      href={topic.gcalLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 transition-colors"
                                      style={{ color: 'var(--text-muted)' }}
                                      title="Google Calendar"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => openRescheduleModal(topic)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                                    style={{ background: 'var(--bg-card-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                  >
                                    🗓️ Reschedule
                                  </button>
                                  <button
                                    onClick={() => startFocusOnTopic(topic)}
                                    className="btn-primary flex items-center gap-1 text-[11px] py-1 px-2.5"
                                  >
                                    <Play className="w-3 h-3 fill-white" />
                                    <span>Focus</span>
                                  </button>
                                  <button
                                    onClick={() => deleteTopic(topic.id)}
                                    className="px-1.5 py-1 text-xs transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
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
