import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { GateTaskCategory, GATE_TASK_CATEGORIES } from '../types';
import { X, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

export const TopicModal: React.FC = () => {
  const {
    isTopicModalOpen,
    closeTopicModal,
    topicModalDefaultDate,
    subjects,
    tags,
    settings,
    addTopic,
    openCreateSubjectModal,
    isTourOpen,
    tourStep
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
  const [selectedTagId, setSelectedTagId] = useState<string>(tags[0]?.id || '');
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');
  const [category, setCategory] = useState<GateTaskCategory>('pyq');
  const [name, setName] = useState<string>('');
  const [approxHours, setApproxHours] = useState<number>(1.5);
  const [scheduledDate, setScheduledDate] = useState<string>(
    topicModalDefaultDate || AnalyticsService.getTodayDateString()
  );
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isTopicModalOpen) return null;

  const selectedSubject = subjects.find(s => s.id === (subjectId || subjects[0]?.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTagId = selectedTagId || tags[0]?.id;
    const targetSubId = subjectId || subjects[0]?.id || targetTagId;
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await addTopic({
        tags: targetTagId ? [targetTagId] : undefined,
        subjectId: targetSubId,
        name: name.trim(),
        category: isGatePrep ? category : undefined,
        approxHours: Number(approxHours) || 1,
        scheduledDate,
        scheduledTime,
        status: 'todo',
        notes: notes.trim()
      });

      setName('');
      setNotes('');
      closeTopicModal();
    } catch (err) {
      console.error('Failed to add topic:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full sm:max-w-lg max-sm:rounded-t-2xl sm:rounded-2xl p-6 space-y-5 max-sm:max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile pull handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {isGatePrep ? 'Add GATE Study Task' : 'Add Study Topic'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isGatePrep ? 'Queue a concept, PYQ drill, mock test, or revision' : 'Queue a new topic or task'}
              </p>
            </div>
          </div>

          <button
            onClick={closeTopicModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="p-4 rounded-xl text-xs space-y-2"
            style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', color: 'var(--warn)' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>You don't have any subjects yet. Create your first subject to schedule topics!</span>
            </div>
            <button
              type="button"
              onClick={openCreateSubjectModal}
              className="btn-primary text-xs"
            >
              + Create Subject
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tour Banner */}
            {isTourOpen && tourStep === 1 && (
              <div className="p-3 rounded-xl text-xs flex items-center gap-2.5 animate-pulse"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="font-medium leading-snug">
                  <strong style={{ color: 'var(--text-primary)' }}>Step 1 of 3:</strong> Enter what you want to study, choose estimated hours, and tap <strong>Add Topic</strong>!
                </span>
              </div>
            )}

            {/* GATE Task Type Pills */}
            {isGatePrep && (
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Prep Mode</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => {
                    const cat = GATE_TASK_CATEGORIES[catKey];
                    const isSelected = category === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setCategory(catKey)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        style={{
                          border: '1px solid var(--border)',
                          background: isSelected ? 'var(--accent)' : 'var(--bg-card-alt)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tag / Domain Selector */}
            {tags.length > 0 && (
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Tag / Domain
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map(tag => {
                    const isSelected = selectedTagId === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedTagId(tag.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
                        style={{
                          background: isSelected ? `${tag.color}25` : 'var(--bg-card-alt)',
                          color: isSelected ? tag.color : 'var(--text-secondary)',
                          border: isSelected ? `1.5px solid ${tag.color}` : '1px solid var(--border)',
                          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        <span>{tag.icon || '🏷️'}</span>
                        <span>#{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subject Selector (shown if subjects exist and preparing for GATE or explicit subjects) */}
            {subjects.length > 0 && isGatePrep && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Subject Syllabus</label>
                  <button
                    type="button"
                    onClick={openCreateSubjectModal}
                    className="text-xs font-bold hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    + New Subject
                  </button>
                </div>
                <select
                  value={subjectId || subjects[0]?.id || ''}
                  onChange={e => setSubjectId(e.target.value)}
                  className="input-base w-full"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}{sub.examWeightageMarks ? ` — 🎯 ${sub.examWeightageMarks} Marks` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic Name */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Topic Title</label>
              <input
                type="text"
                required
                autoFocus
                placeholder={isGatePrep ? 'e.g. Dynamic Programming + 25 Last-10-Year PYQs' : 'e.g. Dynamic Programming: Longest Common Subsequence'}
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-base w-full"
              />
              {isGatePrep && selectedSubject?.highYieldTopics && selectedSubject.highYieldTopics.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>High-Yield GATE Topics:</span>
                  {selectedSubject.highYieldTopics.map(hy => (
                    <button
                      key={hy}
                      type="button"
                      onClick={() => setName(`${hy} (${GATE_TASK_CATEGORIES[category].label})`)}
                      className="text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                    >
                      + {hy}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hours & Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Approx Hours</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    required
                    value={approxHours}
                    onChange={e => setApproxHours(parseFloat(e.target.value) || 0.5)}
                    className="input-base w-full font-mono"
                  />
                  <span className="absolute right-3 top-2 text-xs pointer-events-none" style={{ color: 'var(--text-muted)' }}>hrs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>When (Date)</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="input-base w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Time (Optional)</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="input-base w-full font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Key concepts, references..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-base w-full"
              />
            </div>

            {/* Google Calendar hint */}
            <div className="p-3 rounded-xl text-[11px] flex items-center justify-between font-semibold"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
              <span>📅 Auto-schedules event on Google Calendar</span>
              <span style={{ color: '#10b981' }}>Ready</span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeTopicModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50"
              >
                {isSubmitting ? 'Scheduling...' : 'Add Topic'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
