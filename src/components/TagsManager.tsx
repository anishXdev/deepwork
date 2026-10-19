import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Tag, DEFAULT_TAG_PALETTE, SUBJECT_PALETTE } from '../types';
import {
  Hash,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Circle,
  Sparkles,
  Clock,
  Briefcase,
  Rocket,
  Code,
  Zap,
  BookOpen,
  Flame,
  ShieldCheck,
  Download,
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const TagsManager: React.FC = () => {
  const {
    tags,
    addTag,
    deleteTag,
    topics,
    sessions,
    addTopic,
    toggleTopicCompletion,
    setActiveFocusTopic,
    setActiveTab,
    exportBackup
  } = useApp();

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(SUBJECT_PALETTE[0].hex);
  const [newTagIcon, setNewTagIcon] = useState('⚡');
  const [expandedTagId, setExpandedTagId] = useState<string | null>(tags[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline task addition per tag
  const [inlineTaskTitle, setInlineTaskTitle] = useState<Record<string, string>>({});
  const [inlineTaskHours, setInlineTaskHours] = useState<Record<string, number>>({});

  const todayStr = AnalyticsService.getTodayDateString();

  const EMOJI_OPTIONS = ['💼', '🚀', '💻', '⚡', '🧠', '📚', '🔥', '🎯', '🛠️', '💡', '🌐', '🧪', '🎨', '📝', '🏆', '⭐'];

  // Quick Starter Bundles
  const TEMPLATE_BUNDLES = [
    {
      name: '💼 Internship & Jobs',
      tags: [
        { name: 'internship', color: '#0C66E4', icon: '💼' },
        { name: 'resume-review', color: '#8B5CF6', icon: '📄' },
        { name: 'interviews', color: '#F59E0B', icon: '🎯' },
        { name: 'dsa-practice', color: '#06B6D4', icon: '💻' }
      ]
    },
    {
      name: '🚀 Hackathon Sprint',
      tags: [
        { name: 'hackathon', color: '#8B5CF6', icon: '🚀' },
        { name: 'frontend', color: '#06B6D4', icon: '🎨' },
        { name: 'backend-api', color: '#10B981', icon: '⚡' },
        { name: 'pitch-deck', color: '#EC4899', icon: '🏆' }
      ]
    },
    {
      name: '💻 Dev & Projects',
      tags: [
        { name: 'dev', color: '#0C66E4', icon: '💻' },
        { name: 'system-design', color: '#F59E0B', icon: '🏗️' },
        { name: 'bug-fixes', color: '#EF4444', icon: '🔥' },
        { name: 'documentation', color: '#14B8A6', icon: '📝' }
      ]
    },
    {
      name: '🧠 Deep Work & Study',
      tags: [
        { name: 'deep-work', color: '#F59E0B', icon: '🧠' },
        { name: 'research-papers', color: '#8B5CF6', icon: '📚' },
        { name: 'revision', color: '#10B981', icon: '🔁' },
        { name: 'notes-synthesis', color: '#6366F1', icon: '📓' }
      ]
    }
  ];

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTagName.trim().replace(/^#+/, '').toLowerCase();
    if (!cleanName) return;

    const created = addTag(cleanName, newTagColor, newTagIcon);
    setNewTagName('');
    setExpandedTagId(created.id);
    Haptics.success();
  };

  const handleApplyTemplate = (bundleTags: { name: string; color: string; icon: string }[]) => {
    Haptics.notification();
    let lastCreatedId: string | null = null;
    bundleTags.forEach(bt => {
      const exists = tags.some(t => t.name.toLowerCase() === bt.name.toLowerCase());
      if (!exists) {
        const created = addTag(bt.name, bt.color, bt.icon);
        lastCreatedId = created.id;
      }
    });
    if (lastCreatedId) {
      setExpandedTagId(lastCreatedId);
    }
  };

  const handleAddInlineTask = async (tagId: string, tagName: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = inlineTaskTitle[tagId]?.trim();
    if (!title) return;

    const hours = inlineTaskHours[tagId] || 1.5;

    await addTopic({
      name: title,
      tags: [tagId],
      approxHours: hours,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      status: 'todo',
      notes: `Tag: #${tagName}`
    });

    setInlineTaskTitle(prev => ({ ...prev, [tagId]: '' }));
    Haptics.success();
  };

  const startFocusOnTag = (tag: Tag) => {
    Haptics.tap();
    // Find first unfinished topic with this tag or create a generic focus session
    const candidateTopic = topics.find(t => 
      t.status !== 'completed' && (t.tags?.includes(tag.id) || t.subjectId === tag.id)
    );
    if (candidateTopic) {
      setActiveFocusTopic(candidateTopic);
    }
    setActiveTab('timer');
  };

  // Helper: get tasks associated with a tag (supports both t.tags array and legacy t.subjectId)
  const getTasksForTag = (tagId: string) => {
    return topics.filter(t => 
      (t.tags && t.tags.includes(tagId)) || t.subjectId === tagId
    );
  };

  // Helper: calculate total hours logged in sessions for a tag
  const getHoursLoggedForTag = (tagId: string) => {
    const matchingSessions = sessions.filter(s => s.tagId === tagId || s.subjectId === tagId);
    const totalMinutes = matchingSessions.reduce((acc, s) => acc + (s.durationMinutes || (s.durationHours || 0) * 60), 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-6">

      {/* ── Top Bar: Title & Safety Indicator ─────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Tags & Workspaces
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Universal tags for internships, hackathons, software projects, deep work, and study.
              </p>
            </div>
          </div>
        </div>

        {/* Data Safety Engine Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981'
            }}
            title="Auto-snapshots on every schema mutation. Zero data loss."
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Robust Storage Active</span>
          </div>

          <button
            onClick={() => { Haptics.tap(); exportBackup(); }}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
            title="Export full JSON backup"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* ── Quick Starter Bundles ─────────────────────────────── */}
      <div
        className="p-4 rounded-xl flex flex-col gap-3"
        style={{
          background: 'var(--bg-card-alt)',
          border: '1px solid var(--border)'
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            Quick Workspace Templates:
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            One-tap setup for your high-impact domains
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TEMPLATE_BUNDLES.map(bundle => (
            <button
              key={bundle.name}
              onClick={() => handleApplyTemplate(bundle.tags)}
              className="p-2.5 rounded-lg text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex flex-col gap-1.5"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)'
              }}
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {bundle.name}
              </span>
              <div className="flex flex-wrap gap-1">
                {bundle.tags.map(t => (
                  <span
                    key={t.name}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${t.color}15`,
                      color: t.color,
                      border: `1px solid ${t.color}30`
                    }}
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Inline Tag Creator & Search Bar ───────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Fast inline tag creator form */}
        <form onSubmit={handleCreateTag} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">#</span>
            <input
              type="text"
              placeholder="Add new tag (e.g. internship, hackathon, dev)..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="input-base pl-7 pr-3 py-1.5 text-xs w-full font-medium"
            />
          </div>

          {/* Emoji selector */}
          <select
            value={newTagIcon}
            onChange={e => setNewTagIcon(e.target.value)}
            className="input-base py-1.5 px-2 text-xs cursor-pointer w-14 text-center"
            title="Choose tag icon"
          >
            {EMOJI_OPTIONS.map(emoji => (
              <option key={emoji} value={emoji}>{emoji}</option>
            ))}
          </select>

          {/* Color Palette Chips */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {SUBJECT_PALETTE.slice(0, 8).map(c => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setNewTagColor(c.hex)}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${newTagColor === c.hex ? 'scale-125 ring-2 ring-white dark:ring-slate-900 shadow-xs' : 'opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!newTagName.trim()}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tag</span>
          </button>
        </form>

        {/* Search / Filter input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-base py-1.5 px-3 text-xs w-full"
          />
        </div>
      </div>

      {/* ── Tags Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.map(tag => {
          const tagTasks = getTasksForTag(tag.id);
          const completedTasks = tagTasks.filter(t => t.status === 'completed');
          const openTasks = tagTasks.filter(t => t.status !== 'completed');
          const hoursLogged = getHoursLoggedForTag(tag.id);
          const completionPct = tagTasks.length > 0 
            ? Math.round((completedTasks.length / tagTasks.length) * 100) 
            : 0;
          const isExpanded = expandedTagId === tag.id;

          return (
            <div
              key={tag.id}
              className="rounded-xl flex flex-col transition-all shadow-xs"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Tag Header Card */}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none">{tag.icon || '🏷️'}</span>
                    <span
                      className="font-bold text-sm truncate"
                      style={{ color: tag.color }}
                    >
                      #{tag.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startFocusOnTag(tag)}
                      className="p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                      style={{
                        background: `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}30`
                      }}
                      title={`Start focus timer on #${tag.name}`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="text-[11px] hidden sm:inline">Focus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTag(tag.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                      title="Delete tag (tasks will be preserved)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg text-center" style={{ background: 'var(--bg-card-alt)' }}>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Tasks</div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {openTasks.length} <span className="text-[10px] font-normal text-slate-400">/ {tagTasks.length}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Hours Logged</div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {hoursLogged}h
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Progress</div>
                    <div className="text-xs font-bold" style={{ color: tag.color }}>
                      {completionPct}%
                    </div>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-alt)' }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${completionPct}%`, backgroundColor: tag.color }}
                  />
                </div>

                {/* Toggle Expand Details */}
                <button
                  type="button"
                  onClick={() => setExpandedTagId(isExpanded ? null : tag.id)}
                  className="w-full pt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <span>{openTasks.length} pending tasks</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Expandable Task List & Inline Add */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t flex flex-col gap-2.5" style={{ borderColor: 'var(--border)' }}>
                  
                  {/* Task list items */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {tagTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">
                        No tasks yet under #{tag.name}
                      </p>
                    ) : (
                      tagTasks.map(t => {
                        const isDone = t.status === 'completed';
                        return (
                          <div
                            key={t.id}
                            className={`p-2 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors ${isDone ? 'opacity-50 line-through' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                            style={{ background: 'var(--bg-card-alt)' }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleTopicCompletion(t.id)}
                                className="cursor-pointer text-slate-400 hover:text-emerald-500"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>
                              <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                                {t.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {t.approxHours}h
                              </span>
                              {!isDone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFocusTopic(t);
                                    setActiveTab('timer');
                                  }}
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                                  title="Focus on this task"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inline quick task adder */}
                  <form
                    onSubmit={e => handleAddInlineTask(tag.id, tag.name, e)}
                    className="flex items-center gap-1.5 pt-1"
                  >
                    <input
                      type="text"
                      placeholder={`Add task to #${tag.name}...`}
                      value={inlineTaskTitle[tag.id] || ''}
                      onChange={e => setInlineTaskTitle(prev => ({ ...prev, [tag.id]: e.target.value }))}
                      className="input-base text-xs py-1 px-2.5 flex-1"
                    />

                    <select
                      value={inlineTaskHours[tag.id] || 1.5}
                      onChange={e => setInlineTaskHours(prev => ({ ...prev, [tag.id]: parseFloat(e.target.value) || 1.5 }))}
                      className="input-base text-xs py-1 px-1.5 w-16"
                    >
                      <option value={0.5}>0.5h</option>
                      <option value={1.0}>1.0h</option>
                      <option value={1.5}>1.5h</option>
                      <option value={2.0}>2.0h</option>
                      <option value={3.0}>3.0h</option>
                    </select>

                    <button
                      type="submit"
                      disabled={!(inlineTaskTitle[tag.id] || '').trim()}
                      className="btn-primary text-xs py-1 px-2.5 disabled:opacity-50 cursor-pointer"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
