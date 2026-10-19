import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Topic, Subject, GateTaskCategory, GATE_TASK_CATEGORIES, GATE_STREAM_SYLLABUS } from '../types';
import {
  Play,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  ArrowRight,
  RotateCcw,
  GraduationCap,
  Sparkles,
  Settings2,
  X,
  Check,
  CalendarClock,
  Layers,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

type ColumnId = 'backlog' | 'today' | 'tomorrow' | 'completed';

export const TodayTomorrowView: React.FC = () => {
  const {
    topics,
    subjects,
    settings,
    updateSettings,
    toggleTopicCompletion,
    setActiveFocusTopic,
    setActiveTab,
    openAddTopicModal,
    openRescheduleModal,
    openCreateSubjectModal,
    deleteTopic,
    addTopic,
    updateTopic,
    setStudyMode,
    loadGateStreamSyllabus,
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
  const examDateStr = settings.gateExamDate || (isGatePrep ? '2027-02-06' : '');
  const targetStream = settings.gateTargetStream || 'CSE';
  const customExamName = settings.examName || 'Target Exam';

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [isEditingExamModal, setIsEditingExamModal] = useState<boolean>(false);
  const [activeInlineAddColumn, setActiveInlineAddColumn] = useState<ColumnId | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineSubjectId, setInlineSubjectId] = useState('');
  const [inlineHours, setInlineHours] = useState(1.5);
  const [inlineCategory, setInlineCategory] = useState<GateTaskCategory>('concept');
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  const todayStr = AnalyticsService.getTodayDateString();
  const tomorrowStr = AnalyticsService.getTomorrowDateString();

  // Calculate days left to exam
  const getDaysUntilExam = () => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr + 'T00:00:00');
    if (isNaN(examDate.getTime())) return null;
    const diffMs = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };
  const daysUntilExam = getDaysUntilExam();

  // Weekly study progress
  const recommendation = AnalyticsService.getSmartPacingRecommendation(
    settings.weeklyHoursTarget,
    useApp().sessions,
    settings.weekStartsOnMonday
  );

  // Filter topics by subject if filter is active
  const filteredTopics = selectedSubjectFilter === 'all'
    ? topics
    : topics.filter(t => t.subjectId === selectedSubjectFilter);

  // Group into Trello Kanban columns
  const backlogTopics = filteredTopics.filter(t =>
    t.status !== 'completed' &&
    (!t.scheduledDate || (t.scheduledDate > tomorrowStr))
  );

  const todayTopics = filteredTopics.filter(t =>
    t.status !== 'completed' &&
    t.scheduledDate &&
    t.scheduledDate <= todayStr
  );

  const tomorrowTopics = filteredTopics.filter(t =>
    t.status !== 'completed' &&
    t.scheduledDate === tomorrowStr
  );

  const completedTopics = filteredTopics.filter(t => t.status === 'completed');

  const getSubject = (id: string): Subject | undefined => subjects.find(s => s.id === id);

  const startFocusOnTopic = (topic: Topic) => {
    Haptics.tap();
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  // Move a card to a specific column
  const handleMoveCard = (topicId: string, targetCol: ColumnId) => {
    Haptics.tap();
    if (targetCol === 'today') {
      updateTopic(topicId, { scheduledDate: todayStr, status: 'todo' });
    } else if (targetCol === 'tomorrow') {
      updateTopic(topicId, { scheduledDate: tomorrowStr, status: 'todo' });
    } else if (targetCol === 'backlog') {
      // Future date or remove date
      const future = new Date();
      future.setDate(future.getDate() + 7);
      updateTopic(topicId, { scheduledDate: future.toISOString().split('T')[0], status: 'todo' });
    } else if (targetCol === 'completed') {
      updateTopic(topicId, { status: 'completed' });
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, topicId: string) => {
    setDraggedTopicId(topicId);
    e.dataTransfer.setData('text/plain', topicId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: ColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const topicId = e.dataTransfer.getData('text/plain') || draggedTopicId;
    if (topicId) {
      handleMoveCard(topicId, targetCol);
    }
    setDraggedTopicId(null);
  };

  // Inline Card Creation inside a Column
  const handleInlineAddSubmit = async (colId: ColumnId) => {
    if (!inlineTitle.trim()) {
      setActiveInlineAddColumn(null);
      return;
    }

    let targetSubId = inlineSubjectId || subjects[0]?.id;
    if (!targetSubId) {
      const defSub = subjects[0] || { id: 'default' };
      targetSubId = defSub.id;
    }

    let scheduledDate = todayStr;
    if (colId === 'tomorrow') scheduledDate = tomorrowStr;
    if (colId === 'backlog') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      scheduledDate = d.toISOString().split('T')[0];
    }

    await addTopic({
      name: inlineTitle.trim(),
      subjectId: targetSubId,
      category: isGatePrep ? inlineCategory : undefined,
      approxHours: Number(inlineHours) || 1.5,
      scheduledDate,
      scheduledTime: colId === 'today' ? '10:00' : '09:00',
      status: colId === 'completed' ? 'completed' : 'todo',
      notes: '',
    });

    setInlineTitle('');
    setActiveInlineAddColumn(null);
    Haptics.success();
  };

  // Calculate total hours in each column
  const calcHours = (items: Topic[]) => {
    const total = items.reduce((acc, t) => acc + (t.approxHours || 1), 0);
    return Math.round(total * 10) / 10;
  };

  return (
    <div className="w-full px-4 sm:px-6 py-4 flex flex-col gap-4 max-w-[1500px] mx-auto">

      {/* ── Trello Board Header Bar ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        
        {/* Left: Board Name & Key Stats */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {isGatePrep ? `GATE ${targetStream} Board` : 'Study Board'}
            </h1>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          {/* Exam Countdown Chip */}
          <button
            onClick={() => setIsEditingExamModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all hover:brightness-95 cursor-pointer"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
            title="Click to change target exam date or stream"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>
              {daysUntilExam !== null ? (
                <><strong>{daysUntilExam}d</strong> left to {isGatePrep ? `GATE` : customExamName}</>
              ) : (
                <>+ Set Exam Date</>
              )}
            </span>
            <Settings2 className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {/* Weekly Pacing Progress Chip */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <span>🎯</span>
            <span>
              <strong>{recommendation.hoursStudiedThisWeek}h</strong> / {recommendation.weeklyTarget}h this week
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">Filter: All Subjects ({topics.length})</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switcher Pill */}
          <button
            type="button"
            onClick={() => setStudyMode(!isGatePrep, targetStream)}
            className="px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            style={{
              background: isGatePrep ? 'var(--accent)' : 'var(--bg-card)',
              color: isGatePrep ? '#FFFFFF' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
            title={isGatePrep ? 'Switch to Simple Board' : 'Preparing for GATE? Switch to GATE Mode'}
          >
            {isGatePrep ? '🎓 GATE Mode' : '📚 Simple Mode'}
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => openAddTopicModal(todayStr)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ── Trello Kanban Columns ───────────────────────────────── */}
      <div className="trello-board">

        {/* ── Column 1: Backlog / Syllabus ──────────────────────── */}
        <TrelloColumn
          id="backlog"
          title="📋 Backlog & Syllabus"
          items={backlogTopics}
          totalHours={calcHours(backlogTopics)}
          isDragOver={dragOverColumn === 'backlog'}
          onDragOver={e => handleDragOver(e, 'backlog')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'backlog')}
          activeInlineAdd={activeInlineAddColumn === 'backlog'}
          onOpenInlineAdd={() => {
            setActiveInlineAddColumn('backlog');
            setInlineTitle('');
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('backlog')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          subjects={subjects}
          inlineSubjectId={inlineSubjectId}
          setInlineSubjectId={setInlineSubjectId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={(topic) => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              isGatePrep={isGatePrep}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: 'Today',
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 2: Today's Focus ───────────────────────────── */}
        <TrelloColumn
          id="today"
          title="⚡ Today's Focus"
          accentColor="var(--accent)"
          items={todayTopics}
          totalHours={calcHours(todayTopics)}
          isDragOver={dragOverColumn === 'today'}
          onDragOver={e => handleDragOver(e, 'today')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'today')}
          activeInlineAdd={activeInlineAddColumn === 'today'}
          onOpenInlineAdd={() => {
            setActiveInlineAddColumn('today');
            setInlineTitle('');
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('today')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          subjects={subjects}
          inlineSubjectId={inlineSubjectId}
          setInlineSubjectId={setInlineSubjectId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={(topic) => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              isGatePrep={isGatePrep}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: 'Tomorrow',
                action: () => handleMoveCard(topic.id, 'tomorrow'),
              }}
            />
          )}
        />

        {/* ── Column 3: Tomorrow ────────────────────────────────── */}
        <TrelloColumn
          id="tomorrow"
          title="🌅 Tomorrow"
          items={tomorrowTopics}
          totalHours={calcHours(tomorrowTopics)}
          isDragOver={dragOverColumn === 'tomorrow'}
          onDragOver={e => handleDragOver(e, 'tomorrow')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'tomorrow')}
          activeInlineAdd={activeInlineAddColumn === 'tomorrow'}
          onOpenInlineAdd={() => {
            setActiveInlineAddColumn('tomorrow');
            setInlineTitle('');
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('tomorrow')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          subjects={subjects}
          inlineSubjectId={inlineSubjectId}
          setInlineSubjectId={setInlineSubjectId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={(topic) => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              isGatePrep={isGatePrep}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: 'Today',
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 4: Completed ───────────────────────────────── */}
        <TrelloColumn
          id="completed"
          title="✅ Completed"
          accentColor="var(--success)"
          items={completedTopics}
          totalHours={calcHours(completedTopics)}
          isDragOver={dragOverColumn === 'completed'}
          onDragOver={e => handleDragOver(e, 'completed')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'completed')}
          activeInlineAdd={false}
          onOpenInlineAdd={() => {}}
          onCloseInlineAdd={() => {}}
          onInlineSubmit={() => {}}
          inlineTitle=""
          setInlineTitle={() => {}}
          subjects={subjects}
          inlineSubjectId=""
          setInlineSubjectId={() => {}}
          inlineHours={1}
          setInlineHours={() => {}}
          isGatePrep={isGatePrep}
          hideAddButton={true}
          renderCard={(topic) => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              isGatePrep={isGatePrep}
              isCompleted={true}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: 'Reopen',
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

      </div>

      {/* ── Exam Date Settings Modal ────────────────────────────── */}
      {isEditingExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-xl p-5 shadow-lg space-y-4"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Exam Countdown & Stream
                </h3>
              </div>
              <button
                onClick={() => setIsEditingExamModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Target Exam Date
                </label>
                <input
                  type="date"
                  value={examDateStr}
                  onChange={e => updateSettings({ gateExamDate: e.target.value })}
                  className="input-base"
                />
              </div>

              {isGatePrep ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      GATE Branch / Stream
                    </label>
                    <select
                      value={targetStream}
                      onChange={e => {
                        const newStream = e.target.value;
                        updateSettings({ gateTargetStream: newStream });
                        loadGateStreamSyllabus(newStream, false);
                      }}
                      className="input-base"
                    >
                      {Object.entries(GATE_STREAM_SYLLABUS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Target Rank / Goal
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AIR < 100"
                      value={settings.gateTargetAir || ''}
                      onChange={e => updateSettings({ gateTargetAir: e.target.value })}
                      className="input-base"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Exam Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Semester Finals, CAT, AWS..."
                    value={settings.examName || ''}
                    onChange={e => updateSettings({ examName: e.target.value })}
                    className="input-base"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Weekly Target Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={settings.weeklyHoursTarget}
                  onChange={e => updateSettings({ weeklyHoursTarget: Number(e.target.value) || 20 })}
                  className="input-base"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditingExamModal(false)}
                className="btn-primary"
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

/* ── Trello Column Component ───────────────────────────────────── */
interface TrelloColumnProps {
  id: ColumnId;
  title: string;
  items: Topic[];
  totalHours: number;
  accentColor?: string;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  activeInlineAdd: boolean;
  onOpenInlineAdd: () => void;
  onCloseInlineAdd: () => void;
  onInlineSubmit: () => void;
  inlineTitle: string;
  setInlineTitle: (val: string) => void;
  subjects: Subject[];
  inlineSubjectId: string;
  setInlineSubjectId: (val: string) => void;
  inlineHours: number;
  setInlineHours: (val: number) => void;
  isGatePrep: boolean;
  hideAddButton?: boolean;
  renderCard: (topic: Topic) => React.ReactNode;
}

const TrelloColumn: React.FC<TrelloColumnProps> = ({
  title,
  items,
  totalHours,
  accentColor,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  activeInlineAdd,
  onOpenInlineAdd,
  onCloseInlineAdd,
  onInlineSubmit,
  inlineTitle,
  setInlineTitle,
  subjects,
  inlineSubjectId,
  setInlineSubjectId,
  inlineHours,
  setInlineHours,
  isGatePrep,
  hideAddButton,
  renderCard,
}) => {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`trello-column transition-all ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`}
    >
      {/* Column Header */}
      <div className="p-3 pb-2 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-tight uppercase" style={{ color: accentColor || 'var(--text-secondary)' }}>
            {title}
          </h2>
          <span
            className="text-[11px] font-bold px-1.5 py-0.2 rounded-full"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {items.length}
          </span>
        </div>

        {totalHours > 0 && (
          <span className="text-[11px] font-mono text-slate-500">
            {totalHours}h
          </span>
        )}
      </div>

      {/* Cards Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-2 scrollbar-thin">
        {items.map(topic => renderCard(topic))}

        {items.length === 0 && !activeInlineAdd && (
          <div className="py-6 px-3 text-center border-2 border-dashed rounded-lg text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            No tasks here. Drop cards or click + below.
          </div>
        )}

        {/* Inline Card Composer */}
        {activeInlineAdd && (
          <div className="card p-2.5 space-y-2 animate-in fade-in duration-100">
            <textarea
              autoFocus
              rows={2}
              placeholder="What needs to be studied?"
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onInlineSubmit();
                }
              }}
              className="w-full p-2 text-xs rounded border outline-none resize-none"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />

            <div className="flex items-center gap-1.5">
              <select
                value={inlineSubjectId || subjects[0]?.id || ''}
                onChange={e => setInlineSubjectId(e.target.value)}
                className="text-[11px] p-1 rounded border flex-1"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={inlineHours}
                onChange={e => setInlineHours(Number(e.target.value))}
                className="text-[11px] p-1 rounded border w-16"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value={0.5}>0.5h</option>
                <option value={1}>1.0h</option>
                <option value={1.5}>1.5h</option>
                <option value={2}>2.0h</option>
                <option value={3}>3.0h</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={onInlineSubmit}
                className="btn-primary text-xs py-1 px-3"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={onCloseInlineAdd}
                className="p-1 rounded text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column Footer: + Add a card */}
      {!hideAddButton && !activeInlineAdd && (
        <div className="p-2 pt-0">
          <button
            onClick={onOpenInlineAdd}
            className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-left transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-list-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add a card</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Trello Card Component ─────────────────────────────────────── */
interface TrelloCardProps {
  topic: Topic;
  subject?: Subject;
  isGatePrep: boolean;
  isCompleted?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onFocus: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onDelete: () => void;
  primaryAction?: {
    label: string;
    action: () => void;
  };
}

const TrelloCard: React.FC<TrelloCardProps> = ({
  topic,
  subject,
  isGatePrep,
  isCompleted,
  onDragStart,
  onFocus,
  onComplete,
  onReschedule,
  onDelete,
  primaryAction,
}) => {
  const catMeta = isGatePrep && topic.category ? GATE_TASK_CATEGORIES[topic.category] : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`trello-card group flex flex-col gap-2 ${isCompleted ? 'opacity-70' : ''}`}
    >
      {/* Card Labels / Subject Badges (Trello Colored Tags) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {subject && (
          <span
            className="trello-badge"
            style={{
              backgroundColor: `${subject.color}15`,
              color: subject.color,
              border: `1px solid ${subject.color}35`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
            <span className="truncate max-w-[130px]">{subject.name}</span>
          </span>
        )}

        {catMeta && (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${catMeta.bgClass}`}>
            {catMeta.emoji} {catMeta.label}
          </span>
        )}
      </div>

      {/* Card Title */}
      <div className="text-xs sm:text-sm font-semibold leading-snug" style={{
        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: isCompleted ? 'line-through' : 'none',
      }}>
        {topic.name}
      </div>

      {/* Optional Notes Snippet */}
      {topic.notes && (
        <p className="text-[11px] line-clamp-1 italic" style={{ color: 'var(--text-muted)' }}>
          {topic.notes}
        </p>
      )}

      {/* Bottom Metadata & Quick Actions */}
      <div className="flex items-center justify-between pt-1 border-t mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
        
        {/* Badges: Hours & Due */}
        <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{topic.approxHours || 1}h</span>
          </span>

          {topic.scheduledDate && (
            <span className="hidden sm:inline">
              {topic.scheduledDate.slice(5)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Quick Focus Button */}
          {!isCompleted && (
            <button
              onClick={e => { e.stopPropagation(); onFocus(); }}
              className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              title="Focus with Timer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {/* Quick Move Button */}
          {primaryAction && (
            <button
              onClick={e => { e.stopPropagation(); primaryAction.action(); }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
              }}
              title={`Move to ${primaryAction.label}`}
            >
              {primaryAction.label === 'Reopen' ? <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" /> : null}
              {primaryAction.label}
            </button>
          )}

          {/* Complete Checkbox Button */}
          <button
            onClick={e => { e.stopPropagation(); onComplete(); }}
            className={`p-1 rounded transition-colors ${
              isCompleted
                ? 'text-emerald-500'
                : 'text-slate-400 hover:text-emerald-500'
            }`}
            title={isCompleted ? 'Mark as Incomplete' : 'Mark Complete'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>

          {/* Reschedule */}
          <button
            onClick={e => { e.stopPropagation(); onReschedule(); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Reschedule Date"
          >
            <CalendarClock className="w-3 h-3" />
          </button>

          {/* Delete */}
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Card"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
