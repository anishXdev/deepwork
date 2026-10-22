import { RealtimeCollab } from '../services/realtimeCall';
import { CloudSyncService } from '../services/cloudSync';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Topic, Subject, Tag, GateTaskCategory, GATE_TASK_CATEGORIES, BoardMember, TaskPriority } from '../types';
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
  FolderDown,
  Video,
  MessageSquare,
  AtSign,
  Search,
  Pencil,
  KeyRound,
  Minimize2,
  Maximize2,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { parsePriorityShortcut } from '../utils/cardInput';
import { CreateBoardModal } from './CreateBoardModal';
import { CollaborationModal } from './CollaborationModal';
import { JoinBoardModal } from './JoinBoardModal';

type ColumnId = 'backlog' | 'today' | 'tomorrow' | 'this_week';

export const TodayTomorrowView: React.FC = () => {
  const {
    topics,
    subjects,
    tags,
    addTag,
    settings,
    toggleTopicCompletion,
    setActiveFocusTopic,
    setActiveTab,
    openAddTopicModal,
    openRescheduleModal,
    openEditTopicModal,
    deleteTopic,
    addTopic,
    updateTopic,
    boards,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    deleteBoard,
    delegateTopic,
    setIsTemplatesModalOpen,
    setIsTeamRoomOpen,
    activeCall,
    sendCollabNotification,
    profile
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>('all');
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState<boolean>(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState<boolean>(false);
  const [isJoinBoardOpen, setIsJoinBoardOpen] = useState<boolean>(false);
  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState<boolean>(false);
  const [boardSearchQuery, setBoardSearchQuery] = useState<string>('');

  // Active inline add card per column
  const [activeInlineAddColumn, setActiveInlineAddColumn] = useState<ColumnId | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState<TaskPriority>('normal');
  const [inlineTagId, setInlineTagId] = useState('');
  const [inlineHours, setInlineHours] = useState(1);
  const [inlineCategory, setInlineCategory] = useState<GateTaskCategory>('concept');
  const [inlineAssigneeId, setInlineAssigneeId] = useState<string>('');

  const handleAddCardComment = (topic: Topic, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: cleanText,
      authorName: profile.name || profile.email.split('@')[0] || 'Teammate',
      authorEmail: profile.email || undefined,
      createdAt: new Date().toISOString(),
    };
    updateTopic(topic.id, { comments: [...(topic.comments || []), comment] });
  };

  // Drag and Drop & Card delegation
  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [activeDelegatingTopicId, setActiveDelegatingTopicId] = useState<string | null>(null);

  const todayStr = AnalyticsService.getTodayDateString();
  const tomorrowStr = AnalyticsService.getTomorrowDateString();

  const weekEndDate = new Date();
  weekEndDate.setDate(weekEndDate.getDate() + (((7 - weekEndDate.getDay()) % 7) || 7));
  const weekEndStr = weekEndDate.toISOString().slice(0, 10);

  // Filter topics for the active board or directly delegated to the current user
  const myEmail = (profile.email || '').trim().toLowerCase();
  const myId = profile.id;
  const boardTopics = topics.filter(t => 
    (!t.boardId || t.boardId === activeBoardId) ||
    (Boolean(myEmail) && Boolean(t.assigneeEmail) && t.assigneeEmail?.toLowerCase() === myEmail) ||
    (Boolean(myId) && Boolean(t.assigneeId) && t.assigneeId === myId)
  );

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
    (!t.scheduledDate || t.scheduledDate > weekEndStr)
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

  const thisWeekTopics = filteredTopics.filter(t =>
    t.status !== 'completed' && t.scheduledDate > tomorrowStr && t.scheduledDate <= weekEndStr
  );

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
    } else if (targetCol === 'this_week') {
      const nextAvailable = new Date();
      nextAvailable.setDate(nextAvailable.getDate() + 2);
      updateTopic(topicId, { scheduledDate: nextAvailable.toISOString().slice(0, 10) <= weekEndStr ? nextAvailable.toISOString().slice(0, 10) : weekEndStr, status: 'todo' });
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
    if (colId === 'this_week') {
      const planned = new Date();
      planned.setDate(planned.getDate() + 2);
      scheduledDate = planned.toISOString().slice(0, 10) <= weekEndStr ? planned.toISOString().slice(0, 10) : weekEndStr;
    }
    if (colId === 'backlog') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      scheduledDate = d.toISOString().split('T')[0];
    }

    // Check for inline @collaborator mention in title
    const atMatches = (inlineTitle.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());
    let assignedMember = (activeBoard?.members || []).find(m => m.id === inlineAssigneeId);
    if (!assignedMember && atMatches.length > 0) {
      const matchName = atMatches[0];
      assignedMember = (activeBoard?.members || []).find(m =>
        m.name.toLowerCase().includes(matchName) || m.email.toLowerCase().includes(matchName)
      );
    }

    const parsedTitle = parsePriorityShortcut(inlineTitle);
    const cleanTitle = parsedTitle.title
      .replace(/#([a-zA-Z0-9_\-]+)/g, '')
      .replace(/@([a-zA-Z0-9_\-]+)/g, '')
      .trim() || parsedTitle.title;

    const createdTopic = await addTopic({
      boardId: activeBoardId,
      name: cleanTitle,
      tags: finalTags,
      subjectId: targetTagId || 'tag_default',
      category: isGatePrep ? inlineCategory : undefined,
      approxHours: Number(inlineHours) || 1,
      scheduledDate,
      scheduledTime: colId === 'today' ? '10:00' : '09:00',
      status: 'todo',
      priority: parsedTitle.priority || inlinePriority,
      notes: '',
      assigneeId: assignedMember?.id,
      assigneeName: assignedMember?.name,
      assigneeEmail: assignedMember ? (assignedMember.email || '').toLowerCase() : undefined,
      assigneeColor: assignedMember?.color,
      delegatedBy: assignedMember ? (profile.name || profile.email) : undefined,
      delegatedAt: assignedMember ? new Date().toISOString() : undefined,
    });

    if (assignedMember) {
      const recipientEmail = (assignedMember.email || '').toLowerCase().trim();
      sendCollabNotification({
        type: 'task_delegated',
        title: 'Work Delegated',
        message: `Task "${cleanTitle}" was assigned directly to your board`,
        senderName: profile.name || profile.email || 'Deepwork Member',
        senderColor: '#0C66E4',
        boardId: activeBoardId,
        boardName: activeBoard?.name,
        recipientEmail,
        taskId: createdTopic.id,
        taskTitle: cleanTitle,
        task: createdTopic
      });
      RealtimeCollab.sendTaskDelegation(createdTopic, recipientEmail);
      CloudSyncService.scheduleDebouncedPush(500);
    }

    setInlineTitle('');
    setInlinePriority('normal');
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
                className="absolute left-0 top-10 z-40 w-72 rounded-xl p-2 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-100"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span>Work Boards</span>
                  <span>{boards.length}</span>
                </div>

                {/* Search Boards Input */}
                <div className="px-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs border border-transparent focus-within:border-blue-500">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search boards..."
                      value={boardSearchQuery}
                      onChange={e => setBoardSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    {boardSearchQuery && (
                      <button type="button" onClick={() => setBoardSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Boards List */}
                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {boards
                    .filter(b => b.name.toLowerCase().includes(boardSearchQuery.toLowerCase()))
                    .map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setActiveBoardId(b.id);
                          setIsBoardDropdownOpen(false);
                        }}
                        className="group w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        style={{
                          background: b.id === activeBoardId ? 'var(--accent-soft)' : 'transparent',
                          color: b.id === activeBoardId ? 'var(--accent)' : 'var(--text-primary)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{b.icon || '📋'}</span>
                          <span className="truncate max-w-[130px]">{b.name}</span>
                          {(b.members || []).length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">
                              {b.members.length}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {b.id === activeBoardId && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          {boards.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete board "${b.name}"? All cards on this board will be removed.`)) {
                                  deleteBoard(b.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete board"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  {boards.filter(b => b.name.toLowerCase().includes(boardSearchQuery.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No boards matching "{boardSearchQuery}"
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
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
              onClick={() => setIsJoinBoardOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              title="Join a board with a code"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Join Board</span>
            </button>

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



            <button
              onClick={() => {
                Haptics.tap();
                setIsTeamRoomOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              style={{
                background: activeCall?.active ? '#10B98120' : 'var(--bg-card)',
                border: activeCall?.active ? '1px solid #10B98150' : '1px solid var(--border)',
                color: activeCall?.active ? '#10B981' : 'var(--text-secondary)'
              }}
              title="Secure Chat, Audio & Video Call Room"
            >
              <Video className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Team Room & Call</span>
              {activeCall?.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
            </button>
          </div>

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

        {/* ── Column 1: Brainstorm ───────────────────────────────── */}
        <TrelloColumn
          id="backlog"
          title="💡 Brainstorm"
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
            setInlinePriority('normal');
            setInlineHours(1);
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('backlog')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          inlinePriority={inlinePriority}
          setInlinePriority={setInlinePriority}
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          boardMembers={activeBoard?.members || []}
          inlineAssigneeId={inlineAssigneeId}
          setInlineAssigneeId={setInlineAssigneeId}
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
              onEdit={() => openEditTopicModal(topic)}
              onAddComment={text => handleAddCardComment(topic, text)}
              primaryAction={{
                label: "Today's Focus",
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 2: Today's Focus ────────────────────────────── */}
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
            setInlinePriority('normal');
            setInlineHours(1);
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('today')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          inlinePriority={inlinePriority}
          setInlinePriority={setInlinePriority}
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          boardMembers={activeBoard?.members || []}
          inlineAssigneeId={inlineAssigneeId}
          setInlineAssigneeId={setInlineAssigneeId}
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
              onEdit={() => openEditTopicModal(topic)}
              onAddComment={text => handleAddCardComment(topic, text)}
              primaryAction={{
                label: 'Tomorrow',
                action: () => handleMoveCard(topic.id, 'tomorrow'),
              }}
            />
          )}
        />

        {/* ── Column 3: Tomorrow ─────────────────────────────────── */}
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
            setInlinePriority('normal');
            setInlineHours(1);
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('tomorrow')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          inlinePriority={inlinePriority}
          setInlinePriority={setInlinePriority}
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          boardMembers={activeBoard?.members || []}
          inlineAssigneeId={inlineAssigneeId}
          setInlineAssigneeId={setInlineAssigneeId}
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
              onEdit={() => openEditTopicModal(topic)}
              onAddComment={text => handleAddCardComment(topic, text)}
              primaryAction={{
                label: 'Do Today',
                action: () => handleMoveCard(topic.id, 'today'),
              }}
            />
          )}
        />

        {/* ── Column 4: This Week ───────────────────────────────── */}
        <TrelloColumn
          id="this_week"
          title="📅 This Week"
          items={thisWeekTopics}
          totalHours={calcHours(thisWeekTopics)}
          accentColor="#8B5CF6"
          isDragOver={dragOverColumn === 'this_week'}
          onDragOver={e => handleDragOver(e, 'this_week')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, 'this_week')}
          activeInlineAdd={activeInlineAddColumn === 'this_week'}
          onOpenInlineAdd={() => {
            setActiveInlineAddColumn('this_week');
            setInlineTitle('');
            setInlinePriority('normal');
            setInlineHours(1);
          }}
          onCloseInlineAdd={() => setActiveInlineAddColumn(null)}
          onInlineSubmit={() => handleInlineAddSubmit('this_week')}
          inlineTitle={inlineTitle}
          setInlineTitle={setInlineTitle}
          inlinePriority={inlinePriority}
          setInlinePriority={setInlinePriority}
          tags={tags}
          inlineTagId={inlineTagId}
          setInlineTagId={setInlineTagId}
          inlineHours={inlineHours}
          setInlineHours={setInlineHours}
          boardMembers={activeBoard?.members || []}
          inlineAssigneeId={inlineAssigneeId}
          setInlineAssigneeId={setInlineAssigneeId}
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
              onEdit={() => openEditTopicModal(topic)}
              onAddComment={text => handleAddCardComment(topic, text)}
              primaryAction={{
                label: 'Today',
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

      <JoinBoardModal isOpen={isJoinBoardOpen} onClose={() => setIsJoinBoardOpen(false)} />

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
  inlinePriority: TaskPriority;
  setInlinePriority: (val: TaskPriority) => void;
  tags: Tag[];
  inlineTagId: string;
  setInlineTagId: (val: string) => void;
  inlineHours: number;
  setInlineHours: (val: number) => void;
  boardMembers?: BoardMember[];
  inlineAssigneeId: string;
  setInlineAssigneeId: (val: string) => void;
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
  inlinePriority,
  setInlinePriority,
  tags,
  inlineTagId,
  setInlineTagId,
  inlineHours,
  setInlineHours,
  boardMembers,
  inlineAssigneeId,
  setInlineAssigneeId,
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
                  placeholder="Task title, #tag, -high / -urgent / -low..."
                  value={inlineTitle}
                  onChange={e => { const value = e.target.value; setInlineTitle(value); const detected = parsePriorityShortcut(value).priority; if (detected) setInlinePriority(detected); }}
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

              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 font-semibold">Priority:</span>
                {([['low', 'Low', '#10B981'], ['normal', 'Normal', '#3B82F6'], ['high', 'High', '#EF4444'], ['urgent', 'Urgent', '#DC2626']] as [TaskPriority, string, string][]).map(([value, label, color]) => (
                  <button key={value} type="button" onClick={() => setInlinePriority(value)} className="rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all" style={{ color, borderColor: inlinePriority === value ? color : `${color}50`, background: inlinePriority === value ? `${color}20` : 'transparent' }}>{label}</button>
                ))}
                <span className="text-[9px] text-slate-500">or type -h / -u / -l</span>
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

              {/* Collaborator Delegation & @ Mention Chips */}
              {(() => {
                const assignedMember = (boardMembers || []).find(m => m.id === inlineAssigneeId);
                return (
                  <>
                    {assignedMember && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold">Assignee:</span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${assignedMember.color}15`,
                            color: assignedMember.color,
                            borderColor: `${assignedMember.color}35`
                          }}
                        >
                          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: assignedMember.color }}>
                            {assignedMember.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>@{assignedMember.name}</span>
                          <button
                            type="button"
                            onClick={() => setInlineAssigneeId('')}
                            className="hover:opacity-75 cursor-pointer ml-0.5 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    )}

                    {boardMembers && boardMembers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <AtSign className="w-3 h-3 text-blue-500" /> Delegate:
                        </span>
                        {boardMembers.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              Haptics.tap();
                              setInlineAssigneeId(inlineAssigneeId === m.id ? '' : m.id);
                            }}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-all flex items-center gap-1 ${
                              inlineAssigneeId === m.id
                                ? 'ring-1'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{
                              background: `${m.color}15`,
                              color: m.color,
                              borderColor: `${m.color}40`
                            }}
                          >
                            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: m.color }}>
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span>@{m.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

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
  onEdit: () => void;
  onAddComment: (text: string) => void;
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
  onEdit,
  onAddComment,
  primaryAction,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const latestComment = topic.comments?.[topic.comments.length - 1];
  const submitComment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    onAddComment(commentDraft);
    setCommentDraft('');
  };
  const topicTags = (topic.tags || [])
    .map(tid => tags.find(t => t?.id === tid))
    .filter((t): t is Tag => Boolean(t && t.id));

  const priorityStyle = {
    urgent: { label: 'Urgent', color: '#EF4444', soft: 'rgba(239,68,68,.10)' },
    high: { label: 'High', color: '#EF4444', soft: 'rgba(239,68,68,.08)' },
    normal: { label: 'Normal', color: '#3B82F6', soft: 'rgba(59,130,246,.08)' },
    low: { label: 'Low', color: '#10B981', soft: 'rgba(16,185,129,.08)' },
  }[topic.priority || 'normal'];
  const trackingId = topic.trackingId || `DW-${topic.id.slice(-8).replace(/[^a-z0-9]/gi, '').toUpperCase()}`;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`trello-card group flex flex-col justify-between gap-2 relative transition-all ${
        isCompleted ? 'opacity-65' : ''
      }`}
      style={{
        borderLeft: `4px solid ${isCompleted ? '#10B981' : priorityStyle.color}`,
              background: `linear-gradient(145deg, var(--bg-card), ${priorityStyle.soft})`,
        minHeight: isMinimized ? 0 : undefined,
        padding: isMinimized ? '10px 12px' : undefined,
      }}
    >
      {/* Priority and owner */}
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: priorityStyle.color, background: priorityStyle.soft }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityStyle.color }} />{priorityStyle.label}
        </span>

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
        <button
          type="button"
          onClick={event => { event.stopPropagation(); setIsMinimized(value => !value); }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-500/10 hover:text-blue-500"
          title={isMinimized ? 'Expand card' : 'Minimize card'}
          aria-label={isMinimized ? 'Expand card' : 'Minimize card'}
        >
          {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Work title with stable tracking code */}
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4
            className="text-sm font-semibold leading-snug tracking-tight select-text"
            style={{
              color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {topic.name}
            </h4>
            <span className="inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wide" style={{ background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }} title={`Tracking ID: ${topic.id}`}>{trackingId}</span>
          </div>

          {!isMinimized && topic.notes && (
            <p className="text-[11px] line-clamp-2 mt-1 text-slate-400 dark:text-slate-500 select-text">
              {topic.notes}
            </p>
          )}
          {!isMinimized && (topicTags.length > 0 || (!topicTags.length && subject)) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {topicTags.slice(0, 2).map(tag => <span key={tag.id} className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${tag.color || '#3B82F6'}18`, color: tag.color || '#3B82F6' }}>#{tag.name}</span>)}
              {!topicTags.length && subject && <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: `${subject.color || '#3B82F6'}18`, color: subject.color || '#3B82F6' }}>{subject.name}</span>}
              {topicTags.length > 2 && <span className="text-[9px] text-slate-400 self-center">+{topicTags.length - 2}</span>}
            </div>
          )}
          {latestComment && (
            <div className="mt-2 hidden items-start gap-1.5 rounded-lg px-2 py-1.5 text-[10px] group-hover:flex group-focus-within:flex" style={{ background: 'var(--bg-card-alt)' }}>
              <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-violet-400" />
              <p className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-bold text-violet-400">{latestComment.authorName}: </span>{latestComment.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {isCommentOpen && (
        <div className="rounded-xl border p-2.5 space-y-2" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }} onClick={event => event.stopPropagation()}>
          <div className="max-h-28 space-y-2 overflow-y-auto">
            {(topic.comments || []).length === 0 && <p className="text-[10px] text-slate-500">No comments yet. Add the first update.</p>}
            {(topic.comments || []).map(comment => (
              <div key={comment.id} className="text-[11px]">
                <span className="font-bold text-violet-400">{comment.authorName}</span>
                <span className="ml-1 text-[9px] text-slate-500">{new Date(comment.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <p className="mt-0.5 whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>{comment.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={submitComment} className="flex items-center gap-1.5">
            <input value={commentDraft} onChange={event => setCommentDraft(event.target.value)} placeholder="Write a comment…" className="input-base min-w-0 flex-1 py-1.5 text-[11px]" />
            <button type="submit" disabled={!commentDraft.trim()} className="rounded-lg bg-violet-500 p-2 text-white disabled:opacity-40" aria-label="Send comment"><Send className="h-3.5 w-3.5" /></button>
          </form>
        </div>
      )}

      {/* Footer Metadata & Micro-Actions */}
      <div
        className="flex flex-wrap items-center gap-1.5 pt-2 border-t mt-1"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-1.5 py-1 text-cyan-500">
            <Clock className="w-3 h-3" />
            <span>{topic.approxHours || 1}h</span>
          </span>

          {topic.scheduledDate && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-1 text-amber-500" title={`Planned for ${topic.scheduledDate}`}>
              <Calendar className="w-3 h-3" />{topic.scheduledDate.slice(5)}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1">
          {!isCompleted && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onFocus(); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
              title="Start Focus Timer"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Focus</span>
            </button>
          )}

          <button
            type="button"
            onClick={event => { event.stopPropagation(); setIsCommentOpen(value => !value); }}
            className="rounded-md p-1 text-violet-400 hover:bg-violet-500/10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            title={`${topic.comments?.length || 0} comments`}
            aria-label={`Comments on ${topic.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>

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
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded text-slate-400 hover:text-blue-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Edit Card"
            aria-label={`Edit ${topic.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onReschedule(); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Reschedule Date"
          >
            <CalendarClock className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-slate-400 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Delete Card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
