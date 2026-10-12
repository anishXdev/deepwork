import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const TaskCelebrationOverlay: React.FC = () => {
  const { celebrationTask, setCelebrationTask } = useApp();

  useEffect(() => {
    if (celebrationTask) {
      const timer = setTimeout(() => {
        setCelebrationTask(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [celebrationTask, setCelebrationTask]);

  if (!celebrationTask) return null;

  return (
    <div 
      className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-200"
      onClick={() => {
        Haptics.tap();
        setCelebrationTask(null);
      }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/50 bg-[#041619]/95 backdrop-blur-2xl shadow-2xl shadow-emerald-500/25 p-4 sm:p-5 flex items-start space-x-3.5 cursor-pointer">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-2xl pointer-events-none" />
        
        {/* Trophy Badge */}
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-md shrink-0 mt-0.5">
          <Trophy className="w-6 h-6 animate-bounce" />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>Task Completed!</span>
          </div>

          <h4 className="text-sm font-black text-white truncate mt-0.5">
            {celebrationTask.name}
          </h4>

          <p className="text-xs text-emerald-200/90 leading-snug mt-1 font-medium">
            {celebrationTask.quote}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCelebrationTask(null);
          }}
          className="p-1 rounded-xl text-emerald-400/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
