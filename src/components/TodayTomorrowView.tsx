import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Topic, Subject, Tag, GateTaskCategory, GATE_TASK_CATEGORIES, GATE_STREAM_SYLLABUS, BoardMember } from '../types';
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
  Filter,
  Users,
  UserPlus,
  LayoutGrid,
  Hash
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { CreateBoardModal } from './CreateBoardModal';
import { CollaborationModal } from './CollaborationModal';

type ColumnId = 'backlog' | 'today' | 'tomorrow' | 'completed';

export const TodayTomorrowView: React.FC = () => {
  const {
    topics,
    subjects,
    tags,
    settings,
    updateSettings,
    toggleTopicCompletion,
    setActiveFocusTopic,
    setActiveTab,
    openAddTopicModal,
    openRescheduleModal,
    deleteTopic,
    addTopic,
    updateTopic,
    setStudyMode,
    loadGateStreamSyllabus,
    boards,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    delegateTopic
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
  const examDateStr = settings.gateExamDate || (isGatePrep ? '2027-02-06' : '');
  const targetStream = settings.gateTargetStream || 'CSE';
  const customExamName = settings.examName || 'Target Exam';

  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>('all');
  const [isEditingExamModal, setIsEditingExamModal] = useState<boolean>(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState<boolean>(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState<boolean>(false);

  // Active inline add card per column
  const [activeInlineAddColumn, setActiveInlineAddColumn] = useState<ColumnId | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineTagId, setInlineTagId] = useState('');
  const [inlineHours, setInlineHours] = useState(1.5);
  const [inlineCategory, setInlineCategory] = useState<GateTaskCategory>('concept');
  const [inlineAssigneeId, setInlineAssigneeId] = useState<string>('');

  // Drag and Drop & Card delegation
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [activeDelegatingTopicId, setActiveDelegatingTopicId] = useState<string | null>(null);

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

  // Filter topics for the active board
  const boardTopics = topics.filter(t => !t.boardId || t.boardId === activeBoardId);

  // Filter topics by tag (also matches legacy subjectId for backward compatibility)
  const tagFiltered = selectedTagFilter === 'all'
    ? boardTopics
    : boardTopics.filter(t => (t.tags && t.tags.includes(selectedTagFilter)) || t.subjectId === selectedTagFilter);

  // Filter topics by assignee / collaborator
  const filteredTopics = selectedAssigneeFilter === 'all'
    ? tagFiltered
    : selectedAssigneeFilter === 'unassigned'
    ? tagFiltered.filter(t => !t.assigneeId)
    : tagFiltered.filter(t => t.assigneeId === selectedAssigneeFilter);

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

  const getSubject = (id?: string): Subject | undefined => id ? subjects.find(s => s.id === id) : undefined;

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

    const targetTagId = inlineTagId || (selectedTagFilter !== 'all' ? selectedTagFilter : tags[0]?.id);

    let scheduledDate = todayStr;
    if (colId === 'tomorrow') scheduledDate = tomorrowStr;
    if (colId === 'backlog') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      scheduledDate = d.toISOString().split('T')[0];
    }

    const assignedMember = (activeBoard?.members || []).find(m => m.id === inlineAssigneeId);

    await addTopic({
      boardId: activeBoardId,
      name: inlineTitle.trim(),
      tags: targetTagId ? [targetTagId] : undefined,
      subjectId: targetTagId, // backward compatibility
      category: isGatePrep ? inlineCategory : undefined,
      approxHours: Number(inlineHours) || 1.5,
      scheduledDate,
      scheduledTime: colId === 'today' ? '10:00' : '09:00',
      status: colId === 'completed' ? 'completed' : 'todo',
      notes: '',
      assigneeId: assignedMember?.id,
      assigneeName: assignedMember?.name,
      assigneeColor: assignedMember?.color,
    });

    setInlineTitle('');
    setInlineAssigneeId('');
    setActiveInlineAddColumn(null);
    Haptics.success();
  };

  const calcHours = (items: Topic[]) => {
    const total = items.reduce((acc, t) => acc + (t.approxHours || 1), 0);
    return Math.round(total * 10) / 10;
  };

  return (
    <div className="w-full px-4 sm:px-6 py-4 flex flex-col gap-4 max-w-[1500px] mx-auto">

      {/* ── Trello Board Header Bar ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        
        {/* Left: Board Switcher & Collaborators */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Board Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <span>{activeBoard?.icon || '📋'}</span>
              <span className="truncate max-w-[180px]">{activeBoard?.name || 'Study Board'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Dropdown Menu */}
            {isBoardDropdownOpen && (
              <div
                className="absolute left-0 top-10 z-40 w-64 rounded-xl p-2 shadow-2xl space-y-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span>Study Boards</span>
                  <span>{boards.length}</span>
                </div>

                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {boards.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBoardId(b.id);
                        setIsBoardDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      style={{
                        background: b.id === activeBoardId ? 'var(--accent-soft)' : 'transparent',
                        color: b.id === activeBoardId ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{b.icon || '📋'}</span>
                        <span className="truncate">{b.name}</span>
                      </div>
                      {b.id === activeBoardId && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => {
                      setIsBoardDropdownOpen(false);
                      setIsCreateBoardOpen(true);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5 justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Board</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collaborator Avatars & Share/Invite Button */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center -space-x-1.5">
              {(activeBoard?.members || []).slice(0, 4).map(m => (
                <div
                  key={m.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: m.color }}
                  title={`${m.name} (${m.role})`}
                >
                  {m.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsCollabModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)'
              }}
              title="Collaborate & delegate tasks"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Collaborate</span>
            </button>
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
                <><strong>{daysUntilExam}d</strong> left</>
              ) : (
                <>+ Set Exam Date</>
              )}
            </span>
          </button>
        </div>

        {/* Right: Filters & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Filter by Assignee */}
          <select
            value={selectedAssigneeFilter}
            onChange={e => setSelectedAssigneeFilter(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            title="Filter by Collaborator"
          >
            <option value="all">Assignee: All ({boardTopics.length})</option>
            <option value="unassigned">Unassigned</option>
            {(activeBoard?.members || []).map(m => (
              <option key={m.id} value={m.id}>👤 {m.name}</option>
            ))}
          </select>

          {/* Tag Filter Dropdown */}
          <select
            value={selectedTagFilter}
            onChange={e => setSelectedTagFilter(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            title="Filter tasks by tag"
          >
            <option value="all">Tag: All ({boardTopics.length})</option>
            {tags.map(t => (
              <option key={t.id} value={t.id}>#{t.name}</option>
            ))}
          </select>

          {/* Add Task Button */}
          <button
            onClick={() => openAddTopicModal(todayStr)}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ── Trello Kanban Columns ───────────────────────────────── */}
      <div className="trello-board">

        {/* ── Column 1: Backlog & Syllabus ──────────────────────── */}
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
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={topic => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              tags={tags}
              isGatePrep={isGatePrep}
              members={activeBoard?.members || []}
              isDelegating={activeDelegatingTopicId === topic.id}
              onToggleDelegate={() => setActiveDelegatingTopicId(activeDelegatingTopicId === topic.id ? null : topic.id)}
              onAssign={member => {
                delegateTopic(topic.id, member);
                setActiveDelegatingTopicId(null);
              }}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: "Today's Focus",
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 2: Today's Focus ───────────────────────────── */}
        <TrelloColumn
          id="today"
          title="⚡ Today's Focus"
          items={todayTopics}
          totalHours={calcHours(todayTopics)}
          accentColor="var(--accent)"
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
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={topic => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              tags={tags}
              isGatePrep={isGatePrep}
              members={activeBoard?.members || []}
              isDelegating={activeDelegatingTopicId === topic.id}
              onToggleDelegate={() => setActiveDelegatingTopicId(activeDelegatingTopicId === topic.id ? null : topic.id)}
              onAssign={member => {
                delegateTopic(topic.id, member);
                setActiveDelegatingTopicId(null);
              }}
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
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          isGatePrep={isGatePrep}
          renderCard={topic => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              tags={tags}
              isGatePrep={isGatePrep}
              members={activeBoard?.members || []}
              isDelegating={activeDelegatingTopicId === topic.id}
              onToggleDelegate={() => setActiveDelegatingTopicId(activeDelegatingTopicId === topic.id ? null : topic.id)}
              onAssign={member => {
                delegateTopic(topic.id, member);
                setActiveDelegatingTopicId(null);
              }}
              onDragStart={e => handleDragStart(e, topic.id)}
              onFocus={() => startFocusOnTopic(topic)}
              onComplete={() => toggleTopicCompletion(topic.id)}
              onReschedule={() => openRescheduleModal(topic)}
              onDelete={() => deleteTopic(topic.id)}
              primaryAction={{
                label: 'Do Today',
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 4: Completed ───────────────────────────────── */}
        <TrelloColumn
          id="completed"
          title="✅ Completed"
          items={completedTopics}
          totalHours={calcHours(completedTopics)}
          accentColor="#1F845A"
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
          tags={tags}
          inlineTagId=""
          setInlineTagId={() => {}}
          inlineHours={1.5}
          setInlineHours={() => {}}
          isGatePrep={isGatePrep}
          hideAddButton
          renderCard={topic => (
            <TrelloCard
              key={topic.id}
              topic={topic}
              subject={getSubject(topic.subjectId)}
              tags={tags}
              isGatePrep={isGatePrep}
              isCompleted
              members={activeBoard?.members || []}
              isDelegating={activeDelegatingTopicId === topic.id}
              onToggleDelegate={() => setActiveDelegatingTopicId(activeDelegatingTopicId === topic.id ? null : topic.id)}
              onAssign={member => {
                delegateTopic(topic.id, member);
                setActiveDelegatingTopicId(null);
              }}
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

      {/* ── Create Board Modal ────────────────────────────────────── */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
      />

      {/* ── Collaboration & Delegation Modal ──────────────────────── */}
      <CollaborationModal
        isOpen={isCollabModalOpen}
        onClose={() => setIsCollabModalOpen(false)}
      />

      {/* ── Exam Date Settings Modal ─────────────────────────────── */}
      {isEditingExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
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
  tags: Tag[];
  inlineTagId: string;
  setInlineTagId: (val: string) => void;
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
  tags,
  inlineTagId,
  setInlineTagId,
  inlineHours,
  setInlineHours,
  hideAddButton,
  renderCard,
}) => {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`trello-column ${isDragOver ? 'ring-2 ring-blue-500/50 bg-blue-50/20' : ''}`}
    >
      {/* Column Header */}
      <div className="trello-column-header">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor || 'var(--accent)' }}
          />
          <h2 className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-bold">{items.length}</span>
          <span>•</span>
          <span>{totalHours}h</span>
        </div>
      </div>

      {/* Cards Scroll Container */}
      <div className="trello-column-cards">
        {items.map(topic => renderCard(topic))}

        {/* Inline Card Creation Form */}
        {activeInlineAdd && (
          <div
            className="p-3 rounded-lg flex flex-col gap-2.5 shadow-sm"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Enter a title for this card..."
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onInlineSubmit();
                if (e.key === 'Escape') onCloseInlineAdd();
              }}
              className="input-base text-xs py-1.5"
            />

            <div className="flex items-center gap-2">
              <select
                value={inlineTagId}
                onChange={e => setInlineTagId(e.target.value)}
                className="input-base text-xs py-1 flex-1 truncate"
              >
                {tags.map(t => (
                  <option key={t.id} value={t.id}>#{t.name}</option>
                ))}
              </select>

              <select
                value={inlineHours}
                onChange={e => setInlineHours(parseFloat(e.target.value) || 1.5)}
                className="input-base text-xs py-1 w-20"
              >
                <option value={0.5}>0.5h</option>
                <option value={1.0}>1.0h</option>
                <option value={1.5}>1.5h</option>
                <option value={2.0}>2.0h</option>
                <option value={3.0}>3.0h</option>
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
  tags: Tag[];
  isGatePrep: boolean;
  isCompleted?: boolean;
  members: BoardMember[];
  isDelegating: boolean;
  onToggleDelegate: () => void;
  onAssign: (member: BoardMember | null) => void;
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
  tags,
  isGatePrep,
  isCompleted,
  members,
  isDelegating,
  onToggleDelegate,
  onAssign,
  onDragStart,
  onFocus,
  onComplete,
  onReschedule,
  onDelete,
  primaryAction,
}) => {
  const catMeta = isGatePrep && topic.category ? GATE_TASK_CATEGORIES[topic.category] : null;

  const topicTags = (topic.tags || [])
    .map(tid => tags.find(t => t.id === tid))
    .filter((t): t is Tag => Boolean(t));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`trello-card group flex flex-col gap-2 relative ${isCompleted ? 'opacity-70' : ''}`}
    >
      {/* Top Labels: Tags Badge / Subject Badge & Delegated Member Avatar */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {topicTags.map(t => (
            <span
              key={t.id}
              className="trello-badge"
              style={{
                backgroundColor: `${t.color}15`,
                color: t.color,
                border: `1px solid ${t.color}35`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="truncate max-w-[120px]">#{t.name}</span>
            </span>
          ))}

          {topicTags.length === 0 && subject && (
            <span
              className="trello-badge"
              style={{
                backgroundColor: `${subject.color}15`,
                color: subject.color,
                border: `1px solid ${subject.color}35`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
              <span className="truncate max-w-[120px]">{subject.name}</span>
            </span>
          )}

          {catMeta && (
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${catMeta.bgClass}`}>
              {catMeta.emoji} {catMeta.label}
            </span>
          )}
        </div>

        {/* Assignee / Delegation Chip */}
        <div className="relative">
          {topic.assigneeName ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleDelegate(); }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all hover:scale-105 cursor-pointer"
              style={{
                background: `${topic.assigneeColor || '#0C66E4'}15`,
                color: topic.assigneeColor || '#0C66E4',
                border: `1px solid ${topic.assigneeColor || '#0C66E4'}30`
              }}
              title={`Assigned to ${topic.assigneeName} • Click to change`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: topic.assigneeColor || '#0C66E4' }}
              >
                {topic.assigneeName.substring(0, 2).toUpperCase()}
              </span>
              <span className="truncate max-w-[70px]">{topic.assigneeName.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleDelegate(); }}
              className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Delegate to a collaborator"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delegation Popover */}
          {isDelegating && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-6 z-40 p-1.5 rounded-xl shadow-2xl w-44"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Delegate Task</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onAssign(m)}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.name.substring(0, 2).toUpperCase()}
                      </span>
                      <span className="truncate text-slate-700 dark:text-slate-200">{m.name}</span>
                    </div>
                    {topic.assigneeId === m.id && <Check className="w-3 h-3 text-blue-600" />}
                  </button>
                ))}
              </div>
              {topic.assigneeId && (
                <button
                  type="button"
                  onClick={() => onAssign(null)}
                  className="w-full text-left px-2 py-1 mt-1 border-t text-[10px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  ✕ Unassign
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Title */}
      <div className="text-xs sm:text-sm font-semibold leading-snug" style={{
        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: isCompleted ? 'line-through' : 'none',
      }}>
        {topic.name}
      </div>

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
