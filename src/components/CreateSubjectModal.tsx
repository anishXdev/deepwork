import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, X, Check } from 'lucide-react';
import { SUBJECT_PALETTE } from '../types';

export const CreateSubjectModal: React.FC = () => {
  const { isCreateSubjectModalOpen, closeCreateSubjectModal, addSubject } = useApp();

  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_PALETTE[0].hex);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(5);

  if (!isCreateSubjectModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSubject(name.trim(), color, weeklyTargetHours);
    setName('');
    closeCreateSubjectModal();
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
            <div className="p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.2)' }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Add Subject</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create a study domain</p>
            </div>
          </div>

          <button
            onClick={closeCreateSubjectModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Subject Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Distributed Systems, Organic Chemistry..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-base w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Weekly Target (Hours)</label>
            <input
              type="number"
              min="0.5"
              max="80"
              step="0.5"
              value={weeklyTargetHours}
              onChange={e => setWeeklyTargetHours(parseFloat(e.target.value) || 1)}
              className="input-base w-full font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Color Tag (20 Palette Options)</label>
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--accent)' }}>
                {SUBJECT_PALETTE.find(p => p.hex === color)?.name || color}
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2 p-2.5 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              {SUBJECT_PALETTE.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setColor(c.hex)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: c.hex,
                    transform: color === c.hex ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: color === c.hex ? `0 0 0 2px var(--bg-card), 0 0 0 3.5px ${c.hex}` : 'none',
                    opacity: color === c.hex ? 1 : 0.7,
                  }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={closeCreateSubjectModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary active:scale-95 transition-all">
              Create Subject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
