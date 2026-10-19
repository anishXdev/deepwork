import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LayoutGrid, Plus, X, Sparkles, Check } from 'lucide-react';
import { Haptics } from '../utils/haptics';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose }) => {
  const { createBoard } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#0C66E4');
  const [selectedIcon, setSelectedIcon] = useState('📋');

  if (!isOpen) return null;

  const colorOptions = [
    { hex: '#0C66E4', name: 'Trello Blue' },
    { hex: '#10B981', name: 'Emerald' },
    { hex: '#8B5CF6', name: 'Violet' },
    { hex: '#F59E0B', name: 'Amber' },
    { hex: '#EC4899', name: 'Pink' },
    { hex: '#06B6D4', name: 'Cyan' },
    { hex: '#EF4444', name: 'Crimson' },
    { hex: '#64748B', name: 'Slate' },
  ];

  const iconOptions = ['📋', '🎯', '⚡', '📚', '🚀', '🧪', '💡', '🎓', '🏆', '🔥'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    Haptics.success();
    createBoard(name.trim(), description.trim(), selectedColor, selectedIcon);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Create New Study Board</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Board Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Semester 6 Finals, DSA Sprint, System Design..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-base w-full text-xs py-2"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Description / Goal (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 50 leetcode problems & dynamic programming drills"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-base w-full text-xs py-1.5"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Board Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                  style={{
                    background: selectedIcon === icon ? 'var(--accent-soft)' : 'var(--bg-card-alt)',
                    border: selectedIcon === icon ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                    transform: selectedIcon === icon ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: selectedColor === c.hex ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c.hex}` : 'none'
                  }}
                  title={c.name}
                >
                  {selectedColor === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Board</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
