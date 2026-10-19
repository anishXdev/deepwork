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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full sm:max-w-md max-sm:rounded-t-2xl sm:rounded-2xl p-6 space-y-5 max-sm:max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Reschedule</h2>
              <p className="text-xs truncate max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
                {rescheduleTargetTopic.name}
              </p>
            </div>
          </div>

          <button
            onClick={closeRescheduleModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '☀️ Today (3 PM)', offset: 0, time: '15:00' },
              { label: '🌅 Tomorrow (9 AM)', offset: 1, time: '09:00' },
              { label: '🌤️ Tomorrow (2 PM)', offset: 1, time: '14:00' },
              { label: '🗓️ In 2 Days (10 AM)', offset: 2, time: '10:00' },
            ].map(({ label, offset, time: t }) => (
              <button
                key={label}
                type="button"
                onClick={() => handlePreset(offset, t)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date & time */}
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input-base w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="input-base w-full font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeRescheduleModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary disabled:opacity-50"
            >
              {isSaving ? 'Rescheduling...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
