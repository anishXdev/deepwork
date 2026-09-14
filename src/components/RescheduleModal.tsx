import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarClock, X } from 'lucide-react';

export const RescheduleModal: React.FC = () => {
  const { 
    isRescheduleModalOpen, 
    closeRescheduleModal, 
    rescheduleTargetTopic, 
    rescheduleTopic 
  } = useApp();

  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('10:00');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rescheduleTargetTopic) {
      setDate(rescheduleTargetTopic.scheduledDate);
      setTime(rescheduleTargetTopic.scheduledTime || '10:00');
    }
  }, [rescheduleTargetTopic]);

  if (!isRescheduleModalOpen || !rescheduleTargetTopic) return null;

  const handlePreset = (daysOffset: number, presetTime = '10:00') => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setDate(d.toISOString().split('T')[0]);
    setTime(presetTime);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSaving(true);
    try {
      await rescheduleTopic(rescheduleTargetTopic.id, date, time);
      closeRescheduleModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="glass-panel w-full max-w-md rounded-2xl border border-slate-300 dark:border-slate-700/80 shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Reschedule</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {rescheduleTargetTopic.name}
              </p>
            </div>
          </div>

          <button
            onClick={closeRescheduleModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-2">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePreset(0, '15:00')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold text-left transition-colors"
            >
              ☀️ Today (3 PM)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(1, '09:00')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold text-left transition-colors"
            >
              🌅 Tomorrow (9 AM)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(1, '14:00')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold text-left transition-colors"
            >
              🌤️ Tomorrow (2 PM)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(2, '10:00')}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold text-left transition-colors"
            >
              🗓️ In 2 Days (10 AM)
            </button>
          </div>
        </div>

        {/* Custom date & time selector */}
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={closeRescheduleModal}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Rescheduling...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
