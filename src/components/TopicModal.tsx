import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { X, BookOpen, AlertCircle } from 'lucide-react';

export const TopicModal: React.FC = () => {
  const { 
    isTopicModalOpen, 
    closeTopicModal, 
    topicModalDefaultDate, 
    subjects, 
    addTopic,
    openCreateSubjectModal
  } = useApp();

  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');
  const [name, setName] = useState<string>('');
  const [approxHours, setApproxHours] = useState<number>(1.5);
  const [scheduledDate, setScheduledDate] = useState<string>(
    topicModalDefaultDate || AnalyticsService.getTodayDateString()
  );
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isTopicModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectId) return;

    setIsSubmitting(true);
    try {
      await addTopic({
        subjectId,
        name: name.trim(),
        approxHours: Number(approxHours) || 1,
        scheduledDate,
        scheduledTime,
        status: 'todo',
        notes: notes.trim()
      });

      // Reset form & close
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="glass-panel w-full max-w-lg rounded-2xl border border-slate-300 dark:border-slate-700/80 shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add Study Topic</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Queue a new topic or task</p>
            </div>
          </div>

          <button
            onClick={closeTopicModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>You don't have any subjects yet. Create your first subject to schedule topics!</span>
            </div>
            <button
              type="button"
              onClick={openCreateSubjectModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              + Create Subject
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Subject Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <button
                  type="button"
                  onClick={openCreateSubjectModal}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>+ New Subject</span>
                </button>
              </div>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Topic Title
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Dynamic Programming: Longest Common Subsequence"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Approx hours & When to study */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Approx Hours
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    required
                    value={approxHours}
                    onChange={e => setApproxHours(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  When (Date)
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Time (Optional)
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Key concepts, references..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Google Calendar Notification */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-600 dark:text-indigo-300 flex items-center justify-between font-semibold">
              <span>📅 Auto-schedules event on Google Calendar</span>
              <span className="text-emerald-500">Ready</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeTopicModal}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50"
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
