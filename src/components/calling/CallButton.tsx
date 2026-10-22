import React, { useState, useRef, useEffect } from 'react';
import { Video, Phone, ChevronDown } from 'lucide-react';
import { CallType } from '../../types';
import { Haptics } from '../../utils/haptics';

interface CallButtonProps {
  onStartCall: (type: CallType, memberId?: string) => void;
  targetMemberId?: string;
  targetMemberName?: string;
  className?: string;
  variant?: 'compact' | 'full' | 'icon-only';
  disabled?: boolean;
}

export const CallButton: React.FC<CallButtonProps> = ({
  onStartCall,
  targetMemberId,
  targetMemberName,
  className = '',
  variant = 'compact',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (type: CallType) => {
    Haptics.tap();
    setIsOpen(false);
    onStartCall(type, targetMemberId);
  };

  if (variant === 'icon-only') {
    return (
      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-lg border hover:bg-slate-500/10 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer disabled:opacity-40 ${className}`}
          style={{ borderColor: 'var(--border)' }}
          title={targetMemberName ? `Call ${targetMemberName}` : 'Start Call'}
        >
          <Video className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div
            className="absolute right-0 mt-1.5 w-36 rounded-xl border bg-slate-900 text-xs shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => handleSelect('video')}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 font-medium"
            >
              <Video className="w-3.5 h-3.5 text-blue-400" />
              <span>Video Call</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelect('audio')}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio Call</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center rounded-lg shadow-xs" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleSelect('video')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-40 ${className}`}
        title="Start Live Video Call"
      >
        <Video className="w-3.5 h-3.5" />
        {variant === 'full' && <span>Start Video Call</span>}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="px-1.5 py-1.5 rounded-r-lg text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-l-0 border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-40"
        title="More Call Options"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-40 rounded-xl border bg-slate-900 text-xs shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={() => handleSelect('video')}
            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 font-medium"
          >
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>Video Call</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('audio')}
            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center gap-2 font-medium"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voice Audio Call</span>
          </button>
        </div>
      )}
    </div>
  );
};
