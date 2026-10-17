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
    settings,
    addTopic,
    openCreateSubjectModal,
    isTourOpen,
    tourStep
  } = useApp();

  const isGatePrep = Boolean(settings.isGatePrep);
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
    const targetSubId = subjectId || subjects[0]?.id;
    if (!name.trim() || !targetSubId) return;

    setIsSubmitting(true);
    try {
      await addTopic({
        subjectId: targetSubId,
        name: name.trim(),
        category: isGatePrep ? category : undefined,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="glass-panel w-full sm:max-w-lg max-sm:rounded-t-3xl sm:rounded-2xl border border-slate-300 dark:border-slate-700/80 shadow-2xl p-6 space-y-5 max-sm:max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Pill */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-400/30 rounded-full mx-auto mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-200/50 dark:border-ocean-900/50 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-ocean-500/10 text-ocean-600 dark:text-aqua-400 border border-ocean-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isGatePrep ? 'Add GATE Study Task' : 'Add Study Topic'}
              </h2>
              <p className="text-xs text-ocean-700/80 dark:text-ocean-300/70">
                {isGatePrep ? 'Queue a concept, PYQ drill, mock test, or revision' : 'Queue a new topic or task'}
              </p>
            </div>
          </div>

          <button
            onClick={closeTopicModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-ocean-500/10 transition-colors"
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
              className="px-3 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold"
            >
              + Create Subject
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1 Guided Action Highlight Banner */}
            {isTourOpen && tourStep === 1 && (
              <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-400/40 text-teal-300 text-xs flex items-center space-x-2.5 animate-pulse shadow-md shadow-teal-500/10">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-medium leading-snug">
                  <strong className="text-white font-bold">Step 1 of 3:</strong> Enter what you want to study, choose estimated hours, and tap <strong className="text-teal-300 font-bold">Add Topic</strong>!
                </span>
              </div>
            )}

            {/* GATE Task Type Pills (Only in GATE Prep Mode) */}
            {isGatePrep && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Prep Mode
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GATE_TASK_CATEGORIES) as GateTaskCategory[]).map(catKey => {
                    const cat = GATE_TASK_CATEGORIES[catKey];
                    const isSelected = category === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setCategory(catKey)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? `${cat.bgClass} shadow-sm scale-105`
                            : 'bg-slate-100 dark:bg-abyss-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-ocean-900/60 hover:border-teal-500/40'
                        }`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Subject Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <button
                  type="button"
                  onClick={openCreateSubjectModal}
                  className="text-xs text-ocean-600 dark:text-aqua-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>+ New Subject</span>
                </button>
              </div>
              <select
                value={subjectId || subjects[0]?.id || ''}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-ocean-500"
              >
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}{isGatePrep && sub.examWeightageMarks ? ` — 🎯 ${sub.examWeightageMarks} Marks` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Name + High-Yield GATE Topic Suggestions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Topic Title
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={isGatePrep ? "e.g. Dynamic Programming + 25 Last-10-Year PYQs" : "e.g. Dynamic Programming: Longest Common Subsequence"}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-ocean-500"
              />
              {isGatePrep && selectedSubject?.highYieldTopics && selectedSubject.highYieldTopics.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono text-slate-400">High-Yield GATE Topics:</span>
                  {selectedSubject.highYieldTopics.map(hy => (
                    <button
                      key={hy}
                      type="button"
                      onClick={() => setName(`${hy} (${GATE_TASK_CATEGORIES[category].label})`)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/25 transition-colors cursor-pointer"
                    >
                      + {hy}
                    </button>
                  ))}
                </div>
              )}
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
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-ocean-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-ocean-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-ocean-500"
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
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-ocean-500"
              />
            </div>

            {/* Google Calendar Notification */}
            <div className="p-3 rounded-xl bg-ocean-500/10 border border-ocean-500/20 text-[11px] text-ocean-700 dark:text-aqua-300 flex items-center justify-between font-semibold">
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
                className="px-5 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all disabled:opacity-50"
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
