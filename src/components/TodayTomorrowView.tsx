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
  Hash,
  FolderDown
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
    addTag,
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
    delegateTopic,
    setIsTemplatesModalOpen
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

  // Inline Card Creation inside a Column with Automatic #tag Creation
  const handleInlineAddSubmit = async (colId: ColumnId) => {
    if (!inlineTitle.trim()) {
      setActiveInlineAddColumn(null);
      return;
    }

    // Extract all hashtags written as #tag
    const hashtagMatches = (inlineTitle.match(/#([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());
    const matchedOrCreatedTagIds: string[] = [];

    for (const rawTag of hashtagMatches) {
      const clean = rawTag.trim().toLowerCase();
      if (!clean) continue;
      const existing = tags.find(t => t.name.toLowerCase() === clean);
      if (existing) {
        if (!matchedOrCreatedTagIds.includes(existing.id)) {
          matchedOrCreatedTagIds.push(existing.id);
        }
      } else {
        const created = addTag(clean);
        if (!matchedOrCreatedTagIds.includes(created.id)) {
          matchedOrCreatedTagIds.push(created.id);
        }
      }
    }

    if (inlineTagId && !matchedOrCreatedTagIds.includes(inlineTagId)) {
      matchedOrCreatedTagIds.push(inlineTagId);
    }

    const targetTagId = matchedOrCreatedTagIds[0] || (selectedTagFilter !== 'all' ? selectedTagFilter : tags[0]?.id);
    const finalTags = matchedOrCreatedTagIds.length > 0 ? matchedOrCreatedTagIds : (targetTagId ? [targetTagId] : undefined);

    let scheduledDate = todayStr;
    if (colId === 'tomorrow') scheduledDate = tomorrowStr;
    if (colId === 'backlog') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      scheduledDate = d.toISOString().split('T')[0];
    }

    const assignedMember = (activeBoard?.members || []).find(m => m.id === inlineAssigneeId);
    const cleanTitle = inlineTitle.replace(/#([a-zA-Z0-9_\-]+)/g, '').trim() || inlineTitle.trim();

    await addTopic({
      boardId: activeBoardId,
      name: cleanTitle,
      tags: finalTags,
      subjectId: targetTagId || 'tag_default',
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
              {(activeBoard?.members || []).filter(Boolean).slice(0, 4).map(m => (
                <div
                  key={m?.id || Math.random().toString()}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: m?.color || '#0C66E4' }}
                  title={`${m?.name || 'Member'} (${m?.role || 'editor'})`}
                >
                  {(m?.name || 'M').substring(0, 2).toUpperCase()}
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
            title="Click to change target deadline date"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {daysUntilExam !== null ? (
                <><strong>{daysUntilExam}d</strong> to deadline</>
              ) : (
                <>+ Set Deadline Date</>
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

          {/* Templates Trigger */}
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 cursor-pointer"
            title="Download or load starter workflow templates"
          >
            <FolderDown className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => openAddTopicModal(todayStr)}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
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

      {/* ── Deadline Date Settings Modal ─────────────────────────────── */}
      {isEditingExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Target Deadline Date
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
                  Target Deadline Date
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
        {activeInlineAdd && (() => {
          const extractedTags = (inlineTitle.match(/#([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());
          return (
            <div
              className="p-3 rounded-xl flex flex-col gap-2.5 shadow-md border animate-in fade-in"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--accent)',
              }}
            >
              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Task title (type #tag to create tags on the fly)..."
                  value={inlineTitle}
                  onChange={e => setInlineTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onInlineSubmit();
                    if (e.key === 'Escape') onCloseInlineAdd();
                  }}
                  className="input-base text-xs py-2 w-full font-medium"
                />

                {/* Live Detected Tags from #hashtag */}
                {extractedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tags:</span>
                    {extractedTags.map(tName => {
                      const existing = tags.find(t => t.name.toLowerCase() === tName);
                      return (
                        <span
                          key={tName}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: existing ? `${existing.color}20` : 'rgba(59,130,246,0.15)',
                            color: existing ? existing.color : '#3B82F6',
                            border: `1px solid ${existing ? existing.color + '40' : 'rgba(59,130,246,0.3)'}`
                          }}
                        >
                          #{tName}
                          {!existing && <span className="text-[9px] opacity-75 font-normal">✨ new tag</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick existing tag chips if available */}
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick tags:</span>
                  {tags.slice(0, 5).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (!inlineTitle.toLowerCase().includes(`#${t.name.toLowerCase()}`)) {
                          setInlineTitle(inlineTitle ? `${inlineTitle.trim()} #${t.name}` : `#${t.name} `);
                        }
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer hover:opacity-85 transition-transform active:scale-95"
                      style={{
                        background: `${t.color}15`,
                        color: t.color,
                        borderColor: `${t.color}35`
                      }}
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Target Duration Selector & Controls */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setInlineHours(h)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        inlineHours === h
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onInlineSubmit}
                    disabled={!inlineTitle.trim()}
                    className="btn-primary text-xs py-1 px-3 font-semibold disabled:opacity-40"
                  >
                    Add Card
                  </button>
                  <button
                    type="button"
                    onClick={onCloseInlineAdd}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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
    .map(tid => tags.find(t => t?.id === tid))
    .filter((t): t is Tag => Boolean(t && t.id));

  const primaryColor = topicTags[0]?.color || subject?.color || '#0C66E4';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`trello-card group flex flex-col justify-between gap-2 relative transition-all ${
        isCompleted ? 'opacity-65' : ''
      }`}
      style={{
        borderLeft: `3.5px solid ${isCompleted ? '#10B981' : primaryColor}`,
      }}
    >
      {/* Top Row: Tags & Assignee Avatar */}
      <div className="flex items-center justify-between gap-1.5 min-h-[20px]">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {topicTags.map(t => {
            const tagColor = t?.color || '#0C66E4';
            return (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: `${tagColor}15`,
                  color: tagColor,
                  border: `1px solid ${tagColor}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tagColor }} />
                <span className="truncate max-w-[110px]">#{t.name}</span>
              </span>
            );
          })}

          {topicTags.length === 0 && subject && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{
                backgroundColor: `${subject.color || '#0d9488'}15`,
                color: subject.color || '#0d9488',
                border: `1px solid ${subject.color || '#0d9488'}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: subject.color || '#0d9488' }} />
              <span className="truncate max-w-[110px]">{subject.name}</span>
            </span>
          )}

          {catMeta && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${catMeta.bgClass}`}>
              {catMeta.emoji} {catMeta.label}
            </span>
          )}

          {/* Priority indicator badge */}
          {topic.priority === 'urgent' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              🔥 Urgent
            </span>
          )}
          {topic.priority === 'high' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              ⚡ High
            </span>
          )}
        </div>

        {/* Assignee / Delegation Chip */}
        <div className="relative shrink-0">
          {topic.assigneeName ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleDelegate(); }}
              className="inline-flex items-center gap-1 p-0.5 pr-2 rounded-full text-[10px] font-semibold transition-all hover:scale-105 cursor-pointer shadow-xs"
              style={{
                background: `${topic.assigneeColor || '#0C66E4'}18`,
                color: topic.assigneeColor || '#0C66E4',
                border: `1px solid ${topic.assigneeColor || '#0C66E4'}35`
              }}
              title={`Assigned to ${topic.assigneeName} • Click to change`}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-xs"
                style={{ backgroundColor: topic.assigneeColor || '#0C66E4' }}
              >
                {topic.assigneeName.substring(0, 2).toUpperCase()}
              </span>
              <span className="truncate max-w-[65px] font-medium">{topic.assigneeName.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleDelegate(); }}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Delegate to a collaborator"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delegation Popover */}
          {isDelegating && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-7 z-40 p-2 rounded-xl shadow-2xl w-48 animate-in fade-in zoom-in-95 duration-100"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Delegate Task</p>
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {members.filter(Boolean).map(m => {
                  const mColor = m?.color || '#0C66E4';
                  const mName = m?.name || 'Member';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onAssign(m)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0"
                          style={{ backgroundColor: mColor }}
                        >
                          {mName.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate text-slate-700 dark:text-slate-200">{mName}</span>
                      </div>
                      {topic.assigneeId === m.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
              {topic.assigneeId && (
                <button
                  type="button"
                  onClick={() => onAssign(null)}
                  className="w-full text-left px-2 py-1.5 mt-1 border-t text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  ✕ Unassign
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Title & Checkbox */}
      <div className="flex items-start gap-2 pt-0.5">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onComplete(); }}
          className={`mt-0.5 shrink-0 transition-colors cursor-pointer ${
            isCompleted
              ? 'text-emerald-500 hover:text-emerald-600'
              : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
          }`}
          title={isCompleted ? 'Mark as Incomplete' : 'Mark Completed'}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h4
            className="text-[13px] font-medium leading-snug tracking-tight select-text"
            style={{
              color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {topic.name}
          </h4>

          {topic.notes && (
            <p className="text-[11px] line-clamp-1 mt-0.5 text-slate-400 dark:text-slate-500 select-text">
              {topic.notes}
            </p>
          )}
        </div>
      </div>

      {/* Footer Metadata & Micro-Actions */}
      <div
        className="flex items-center justify-between pt-1.5 border-t mt-0.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{topic.approxHours || 1}h</span>
          </span>

          {topic.scheduledDate && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400">
              📅 {topic.scheduledDate.slice(5)}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {!isCompleted && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onFocus(); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
              title="Start Focus Timer"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Focus</span>
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); primaryAction.action(); }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
              }}
              title={`Move to ${primaryAction.label}`}
            >
              {primaryAction.label === 'Reopen' ? <RotateCcw className="w-2.5 h-2.5 inline mr-1" /> : null}
              {primaryAction.label}
            </button>
          )}

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onReschedule(); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Reschedule Date"
          >
            <CalendarClock className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Delete Card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
