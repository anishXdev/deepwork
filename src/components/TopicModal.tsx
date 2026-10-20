import { RealtimeCollab } from '../services/realtimeCall';
import { CloudSyncService } from '../services/cloudSync';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { X, LayoutGrid, Clock, Calendar, Hash, Sparkles, AlertCircle, AtSign, Users, UserPlus } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const TopicModal: React.FC = () => {
  const {
    isTopicModalOpen,
    closeTopicModal,
    topicModalDefaultDate,
    tags,
    addTag,
    addTopic,
    activeBoardId,
    activeBoard,
    sendCollabNotification,
    profile
  } = useApp();

  const [titleInput, setTitleInput] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [approxHours, setApproxHours] = useState<number>(1.5);
  const [scheduledDate, setScheduledDate] = useState<string>(
    topicModalDefaultDate || AnalyticsService.getTodayDateString()
  );
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isTopicModalOpen) return null;

  // Real-time extracted hashtags from title input
  const extractedHashtags = (titleInput.match(/#([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());
  const extractedMentions = (titleInput.match(/@([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());

  const handleToggleTag = (tagId: string) => {
    Haptics.tap();
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Auto-create any typed #tags if they don't exist yet
      const tagIdsFromHashtags: string[] = [];
      for (const tName of extractedHashtags) {
        const clean = tName.trim().toLowerCase();
        if (!clean) continue;
        const existing = tags.find(t => t.name.toLowerCase() === clean);
        if (existing) {
          if (!tagIdsFromHashtags.includes(existing.id)) tagIdsFromHashtags.push(existing.id);
        } else {
          const created = addTag(clean);
          if (!tagIdsFromHashtags.includes(created.id)) tagIdsFromHashtags.push(created.id);
        }
      }

      // Combine explicitly clicked tag IDs + extracted hashtag IDs
      const finalTagIds = Array.from(new Set([...selectedTagIds, ...tagIdsFromHashtags]));
      const primarySubjectId = finalTagIds[0] || 'tag_default';

      // Find matching collaborator from @mention or selection
      let assignedMember = (activeBoard?.members || []).find(m => m.id === selectedAssigneeId);
      if (!assignedMember && extractedMentions.length > 0) {
        const matchName = extractedMentions[0];
        assignedMember = (activeBoard?.members || []).find(m =>
          m.name.toLowerCase().includes(matchName) || m.email.toLowerCase().includes(matchName)
        );
      }

      // Clean title text of trailing hashtags and @mentions for sleek display
      const cleanTitle = titleInput
        .replace(/#([a-zA-Z0-9_\-]+)/g, '')
        .replace(/@([a-zA-Z0-9_\-]+)/g, '')
        .trim() || titleInput.trim();

      const createdTopic = await addTopic({
        boardId: activeBoardId,
        name: cleanTitle,
        tags: finalTagIds.length > 0 ? finalTagIds : undefined,
        subjectId: primarySubjectId,
        approxHours: Number(approxHours) || 1.5,
        scheduledDate,
        scheduledTime,
        status: 'todo',
        notes: notes.trim(),
        priority: priority !== 'normal' ? priority : undefined,
        assigneeId: assignedMember?.id,
        assigneeName: assignedMember?.name,
        assigneeEmail: assignedMember ? (assignedMember.email || '').toLowerCase() : undefined,
        assigneeColor: assignedMember?.color,
        delegatedBy: assignedMember ? (profile.name || profile.email) : undefined,
        delegatedAt: assignedMember ? new Date().toISOString() : undefined
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

      Haptics.success();
      setTitleInput('');
      setSelectedAssigneeId('');
      setNotes('');
      setSelectedTagIds([]);
      closeTopicModal();
    } catch (err) {
      console.error('Failed to add card:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full sm:max-w-lg max-sm:rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-4 max-sm:max-h-[92vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mb-1" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Add New Card
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Write <strong>#tag</strong> in title to auto-create tags on the fly
              </p>
            </div>
          </div>

          <button
            onClick={closeTopicModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input with hashtag notice */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Card Title <span className="text-blue-500 font-normal">(Type # to tag)</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. Build authentication flow #backend #auth"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              className="input-base text-sm py-2"
            />

            {/* Live Detected Tags preview */}
            {extractedHashtags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detected:</span>
                {extractedHashtags.map(tName => {
                  const existing = tags.find(t => t.name.toLowerCase() === tName);
                  return (
                    <span
                      key={tName}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                      style={{
                        background: existing ? `${existing.color}20` : 'rgba(59,130,246,0.15)',
                        color: existing ? existing.color : '#3B82F6',
                        border: `1px solid ${existing ? existing.color + '40' : 'rgba(59,130,246,0.3)'}`
                      }}
                    >
                      <span>#{tName}</span>
                      {!existing && <span className="text-[9px] opacity-75 font-normal">✨ auto-creates</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Tag Selector if tags exist */}
          {tags.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Or select existing tags:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map(t => {
                  const isSelected = selectedTagIds.includes(t.id) || extractedHashtags.includes(t.name.toLowerCase());
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTag(t.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer"
                      style={{
                        background: isSelected ? t.color : `${t.color}15`,
                        color: isSelected ? '#ffffff' : t.color,
                        borderColor: isSelected ? t.color : `${t.color}35`,
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)'
                      }}
                    >
                      <span>{t.icon || '🏷️'}</span>
                      <span>#{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collaborator Delegation Section */}
          {activeBoard?.members && activeBoard.members.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <AtSign className="w-3.5 h-3.5 text-blue-500" />
                <span>Delegate to Collaborator (or type @Name in title):</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeBoard.members.map(m => {
                  const isAssigned = selectedAssigneeId === m.id || extractedMentions.includes(m.name.toLowerCase().split(' ')[0]);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        Haptics.tap();
                        setSelectedAssigneeId(selectedAssigneeId === m.id ? '' : m.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isAssigned ? 'ring-2 ring-blue-500 shadow-xs' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        background: isAssigned ? `${m.color}25` : `${m.color}10`,
                        color: m.color,
                        borderColor: isAssigned ? m.color : `${m.color}35`
                      }}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-xs" style={{ background: m.color }}>
                        {m.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span>@{m.name}</span>
                      {isAssigned && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Deadline Date & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>Deadline / Scheduled Date</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="input-base text-xs py-1.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Target Focus Time</span>
              </label>
              <div className="flex items-center gap-1">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setApproxHours(h)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      approxHours === h
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Priority Level
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'normal'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'high'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                ⚡ High
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  priority === 'urgent'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                🔥 Urgent
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Notes & Key Deliverables (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Checklist items, PR links, acceptance criteria..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-base text-xs py-1.5 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={closeTopicModal}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !titleInput.trim()}
              className="btn-primary text-xs px-4 py-1.5 font-bold disabled:opacity-40"
            >
              {isSubmitting ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
