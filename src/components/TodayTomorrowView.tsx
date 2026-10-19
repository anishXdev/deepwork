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
    addSubject,
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
  const [activeFilter, setActiveFilter] = useState<PendingFilter>('today');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<GateTaskCategory | 'all'>('all');

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
    if (!targetSubjectId && subjects.length > 0) targetSubjectId = subjects[0].id;
    if (!targetSubjectId) {
      const defSub = addSubject('General Study', '#B45309', 5);
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
      notes: '',
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
    const colors = ['#B45309', '#0D9488', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const chosenColor = colors[subjects.length % colors.length];
    const created = addSubject(quickNewSubjectName.trim(), chosenColor, 5);
    setQuickSubjectId(created.id);
    setQuickNewSubjectName('');
    setIsQuickAddingSubject(false);
  };

  const allPendingTopics = topics.filter(t => t.status !== 'completed');
  const todayPendingTopics = topics.filter(t => t.scheduledDate <= todayStr && t.status !== 'completed');
  const tomorrowPendingTopics = topics.filter(t => t.scheduledDate === tomorrowStr && t.status !== 'completed');
  const completedTopics = topics.filter(t => t.status === 'completed');

  let displayTopics: Topic[] = [];
  if (activeFilter === 'today') displayTopics = todayPendingTopics;
  else if (activeFilter === 'tomorrow') displayTopics = tomorrowPendingTopics;
  else if (activeFilter === 'all') displayTopics = allPendingTopics;
  else displayTopics = completedTopics;

  if (selectedSubjectFilter !== 'all') {
    displayTopics = displayTopics.filter(t => t.subjectId === selectedSubjectFilter);
  }
  if (selectedCategoryFilter !== 'all') {
    displayTopics = displayTopics.filter(t => (t.category || 'concept') === selectedCategoryFilter);
  }

  const getSubject = (id: string): Subject | undefined => subjects.find(s => s.id === id);

  const startFocusOnTopic = (topic: Topic) => {
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Pacing / Exam Banner */}
      <SmartRecommendationBanner />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.3rem,3vw,1.7rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {activeFilter === 'today' ? "Today's Tasks" : activeFilter === 'tomorrow' ? 'Tomorrow' : activeFilter === 'completed' ? 'Completed' : 'All Tasks'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => openCreateSubjectModal()} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <BookOpen style={{ width: '13px', height: '13px' }} /> Subject
          </button>
          <button onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)} className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <Plus style={{ width: '14px', height: '14px', strokeWidth: 2.5 }} /> Add Task
          </button>
        </div>
      </div>

      {/* Quick-Add Bar */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <form onSubmit={handleQuickAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Input + Submit */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder={isGatePrep ? 'Quick add: PYQ drill, concept, mock…' : 'Quick add a task… (e.g. Read Chapter 4)'}
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="input-base"
              />
              {quickAddSuccess && (
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Check style={{ width: '12px', height: '12px' }} /> Added!
                </span>
              )}
            </div>
            <button type="submit" disabled={!quickTitle.trim()} className="btn-primary" style={{ flexShrink: 0, opacity: !quickTitle.trim() ? 0.42 : 1 }}>
              <Plus style={{ width: '14px', height: '14px' }} /> Add
            </button>
          </div>

          {/* GATE-only category + preset chips */}
          {isGatePrep && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => {
                  const cat = GATE_TASK_CATEGORIES[catKey];
                  const isSel = quickCategory === catKey;
                  return (
                    <button key={catKey} type="button" onClick={() => setQuickCategory(catKey)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', border: `1px solid ${isSel ? 'rgba(180,83,9,0.35)' : 'var(--border)'}`, background: isSel ? 'var(--accent-soft)' : 'var(--bg-card-alt)', color: isSel ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: isSel ? 700 : 500, transition: 'all 0.12s' }}>
                      {cat.emoji} {cat.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {[
                  { label: '25 PYQs', cat: 'pyq' as GateTaskCategory, h: 1.5 },
                  { label: 'Subject Mock', cat: 'mock' as GateTaskCategory, h: 1.5 },
                  { label: 'Full 3h Mock', cat: 'mock' as GateTaskCategory, h: 3 },
                  { label: 'Formula Rev', cat: 'revision' as GateTaskCategory, h: 1 },
                ].map(p => (
                  <button key={p.label} type="button" onClick={() => applyGateTemplate(p.label, p.cat, p.h)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', border: '1px solid rgba(180,83,9,0.25)', background: 'var(--accent-soft)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
              {/* Subject */}
              {isQuickAddingSubject ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="text" placeholder="New subject…" value={quickNewSubjectName} onChange={e => setQuickNewSubjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickCreateSubject(e); } else if (e.key === 'Escape') setIsQuickAddingSubject(false); }} autoFocus className="input-base" style={{ width: '140px', padding: '4px 8px', fontSize: '12px' }} />
                  <button type="button" onClick={handleQuickCreateSubject} className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>Save</button>
                  <button type="button" onClick={() => setIsQuickAddingSubject(false)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '12px' }}>✕</button>
                </div>
              ) : (
                <select value={quickSubjectId || (subjects[0]?.id || '')} onChange={e => { if (e.target.value === '__new__') setIsQuickAddingSubject(true); else setQuickSubjectId(e.target.value); }} className="input-base" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{isGatePrep && s.examWeightageMarks ? ` (${s.examWeightageMarks}M)` : ''}</option>)}
                  <option value="__new__">+ New Subject…</option>
                </select>
              )}

              {/* Today / Tomorrow toggle */}
              <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '7px', padding: '2px' }}>
                {(['today', 'tomorrow'] as const).map(d => (
                  <button key={d} type="button" onClick={() => setQuickDate(d)} style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: quickDate === d ? 700 : 400, background: quickDate === d ? 'var(--text-primary)' : 'transparent', color: quickDate === d ? 'var(--text-inverse)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              {/* Hour selector */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0.5, 1, 1.5, 2, 3].map(h => (
                  <button key={h} type="button" onClick={() => setQuickHours(h)} style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', fontWeight: quickHours === h ? 700 : 400, background: quickHours === h ? 'var(--accent-soft)' : 'var(--bg-card-alt)', color: quickHours === h ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${quickHours === h ? 'rgba(180,83,9,0.25)' : 'var(--border)'}`, cursor: 'pointer', transition: 'background 0.12s' }}>
                    {h === 0.5 ? '30m' : `${h}h`}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => openAddTopicModal(quickDate === 'tomorrow' ? tomorrowStr : todayStr)} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              More options…
            </button>
          </div>
        </form>
      </div>

      {/* Filter tabs + subject filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[
            { key: 'today' as PendingFilter, label: 'Today', count: todayPendingTopics.length },
            { key: 'tomorrow' as PendingFilter, label: 'Tomorrow', count: tomorrowPendingTopics.length },
            { key: 'all' as PendingFilter, label: 'All', count: allPendingTopics.length },
            { key: 'completed' as PendingFilter, label: 'Done', count: completedTopics.length },
          ].map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: activeFilter === f.key ? 700 : 500, background: activeFilter === f.key ? 'var(--text-primary)' : 'transparent', color: activeFilter === f.key ? 'var(--text-inverse)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}>
              {f.label}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: activeFilter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-card-alt)', color: activeFilter === f.key ? 'var(--text-inverse)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{f.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {isGatePrep && (
            <select value={selectedCategoryFilter} onChange={e => setSelectedCategoryFilter(e.target.value as GateTaskCategory | 'all')} className="input-base" style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}>
              <option value="all">All Types</option>
              {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => <option key={catKey} value={catKey}>{GATE_TASK_CATEGORIES[catKey].emoji} {GATE_TASK_CATEGORIES[catKey].label}</option>)}
            </select>
          )}
          {subjects.length > 0 && (
            <select value={selectedSubjectFilter} onChange={e => setSelectedSubjectFilter(e.target.value)} className="input-base" style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Task list or empty */}
      {displayTopics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1.5px dashed var(--border)', borderRadius: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '20px' }}>
            {activeFilter === 'completed' ? <CheckCircle2 style={{ width: '20px', height: '20px', color: 'var(--success)' }} /> : <Sparkles style={{ width: '20px', height: '20px', color: 'var(--accent)' }} />}
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px', marginTop: 0 }}>
            {activeFilter === 'today' && 'Queue is clear for today!'}
            {activeFilter === 'tomorrow' && 'Nothing planned for tomorrow.'}
            {activeFilter === 'all' && 'No pending topics.'}
            {activeFilter === 'completed' && 'No completed topics yet.'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '300px', margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
            {activeFilter === 'today' && (isGatePrep ? 'Queue a PYQ sprint or concept study above.' : 'Add a topic using the quick-add bar above.')}
            {activeFilter === 'tomorrow' && 'Schedule topics for tomorrow to hit the ground running.'}
            {activeFilter === 'all' && 'Add your curriculum topics to begin studying.'}
            {activeFilter === 'completed' && 'Complete study sessions to see achievements here.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => openAddTopicModal(activeFilter === 'tomorrow' ? tomorrowStr : todayStr)} className="btn-primary">+ Add Task</button>
            <button onClick={() => openCreateSubjectModal()} className="btn-secondary">+ Subject</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {displayTopics.map((topic, idx) => {
            const subject = getSubject(topic.subjectId);
            const isCompleted = topic.status === 'completed';
            const progressPercent = topic.approxHours > 0 ? Math.min(100, Math.round((topic.completedHours / topic.approxHours) * 100)) : 0;
            const catMeta = GATE_TASK_CATEGORIES[topic.category || 'concept'];

            return (
              <div
                key={topic.id}
                className="task-item"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '14px 16px',
                  borderBottom: idx < displayTopics.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${subject?.color || 'var(--border)'}`,
                  background: isCompleted ? 'var(--bg-card-alt)' : 'var(--bg-card)',
                  opacity: isCompleted ? 0.65 : 1,
                  transition: 'background 0.12s',
                  cursor: 'default',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTopicCompletion(topic.id)}
                  title={isCompleted ? 'Mark pending' : 'Mark complete'}
                  style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${isCompleted ? 'var(--success)' : 'var(--border)'}`, background: isCompleted ? 'var(--success)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', transition: 'all 0.15s' }}
                >
                  {isCompleted && <Check style={{ width: '11px', height: '11px', color: 'white', strokeWidth: 3 }} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Meta tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    {subject && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: `${subject.color}18`, color: subject.color, border: `1px solid ${subject.color}30`, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: subject.color }} />
                        {subject.name}{isGatePrep && subject.examWeightageMarks ? ` · ${subject.examWeightageMarks}M` : ''}
                      </span>
                    )}
                    {isGatePrep && catMeta && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', fontWeight: 700 }} className={catMeta.bgClass}>
                        {catMeta.emoji} {catMeta.label}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock style={{ width: '10px', height: '10px' }} />
                      {topic.scheduledDate === todayStr ? 'Today' : topic.scheduledDate === tomorrowStr ? 'Tomorrow' : topic.scheduledDate}
                      {topic.scheduledTime ? ` · ${topic.scheduledTime}` : ''}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {topic.approxHours}h{topic.completedHours > 0 ? ` (${topic.completedHours}h done)` : ''}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', margin: 0, lineHeight: 1.4 }}>
                    {topic.name}
                  </h3>

                  {topic.notes && !isCompleted && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px', marginBottom: 0 }}>
                      {topic.notes}
                    </p>
                  )}

                  {/* Progress */}
                  {topic.completedHours > 0 && !isCompleted && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '7px', maxWidth: '200px' }}>
                      <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'var(--bg-card-alt)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ height: '100%', width: `${progressPercent}%`, borderRadius: '99px', background: subject?.color || 'var(--accent)', transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{progressPercent}%</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, alignSelf: 'center' }}>
                  {topic.gcalLink && (
                    <a href={topic.gcalLink} target="_blank" rel="noreferrer" title="Google Calendar" className="btn-ghost" style={{ padding: '5px' }}>
                      <ExternalLink style={{ width: '14px', height: '14px' }} />
                    </a>
                  )}
                  <button onClick={() => openRescheduleModal(topic)} title="Reschedule" className="btn-ghost" style={{ padding: '5px' }}>
                    <CalendarClock style={{ width: '14px', height: '14px' }} />
                  </button>
                  {!isCompleted && (
                    <button onClick={() => startFocusOnTopic(topic)} className="btn-accent" style={{ padding: '5px 11px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Play style={{ width: '12px', height: '12px' }} /> Focus
                    </button>
                  )}
                  <button onClick={() => deleteTopic(topic.id)} title="Delete" className="btn-ghost" style={{ padding: '5px' }}>
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tomorrow nudge */}
      {activeFilter === 'today' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays style={{ width: '15px', height: '15px', color: 'var(--text-muted)', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Plan for Tomorrow</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{tomorrowPendingTopics.length} topic(s) queued.</p>
            </div>
          </div>
          <button onClick={() => openAddTopicModal(tomorrowStr)} className="btn-secondary" style={{ fontSize: '12px', padding: '5px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus style={{ width: '13px', height: '13px' }} /> Add for Tomorrow
          </button>
        </div>
      )}

      <style>{`.task-item:hover { background: var(--bg-card-alt) !important; }`}</style>
    </div>
  );
};
