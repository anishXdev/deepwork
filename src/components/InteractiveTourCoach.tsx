import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CalendarPlus, 
  Timer, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  Play, 
  Sparkles,
  MousePointerClick,
  Check
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const InteractiveTourCoach: React.FC = () => {
  const { 
    isTourOpen, 
    tourStep, 
    setTourStep, 
    nextTourStep, 
    completeTour, 
    activeTab, 
    setActiveTab,
    openAddTopicModal,
    topics,
    isTimerRunning,
    startTimer
  } = useApp();

  // Sync tab with current step
  useEffect(() => {
    if (!isTourOpen) return;
    if (tourStep === 1 && activeTab !== 'study') {
      setActiveTab('study');
    } else if (tourStep === 2 && activeTab !== 'timer') {
      setActiveTab('timer');
    } else if (tourStep === 3 && activeTab !== 'analytics') {
      setActiveTab('analytics');
    }
  }, [isTourOpen, tourStep]);

  if (!isTourOpen) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-3 md:right-8 z-50 w-[calc(100vw-24px)] max-w-md animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-200">
      <div className="relative overflow-hidden rounded-3xl border-2 border-teal-400/60 bg-[#020b14]/95 backdrop-blur-2xl shadow-2xl shadow-teal-500/30 p-5 text-slate-100">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-40 h-24 bg-gradient-to-b from-teal-400/25 to-transparent blur-xl pointer-events-none" />

        {/* Top Header: Step Badge & Skip Button */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/25 text-teal-300 border border-teal-500/40">
              Interactive Tour • Step {tourStep} of 3
            </span>
          </div>

          <button
            onClick={() => {
              Haptics.tap();
              completeTour();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
            title="Skip tour"
          >
            <span className="text-[11px] text-slate-400">Skip</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: How to Add a Task */}
        {tourStep === 1 && (
          <div className="space-y-3.5 relative z-10 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 shadow-md">
                <CalendarPlus className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  1. How to Add a Task
                </h3>
                <p className="text-[11px] text-teal-300 font-medium">
                  Queue your study goals into Today & Tomorrow
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Click the <strong className="text-white font-bold">+ Topic</strong> button at the top (or tap below) to add what you want to study. Enter the topic name, estimate your hours, and save it!
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => {
                  Haptics.tap();
                  openAddTopicModal();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl liquid-btn text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-transform cursor-pointer"
              >
                <MousePointerClick className="w-4 h-4" />
                <span>Open Task Creator</span>
              </button>

              <button
                onClick={() => {
                  Haptics.tap();
                  nextTourStep();
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topics.length > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Great job! You have tasks scheduled. Let's start a focus timer.</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: How to Start a Focus Timer */}
        {tourStep === 2 && (
          <div className="space-y-3.5 relative z-10 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-md">
                <Timer className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  2. Start Your Focus Timer
                </h3>
                <p className="text-[11px] text-amber-300 font-medium">
                  3D liquid timer that never resets on tab switch
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tap the <strong className="text-white font-bold">Flow (Play ▶)</strong> button below to launch your focus session. The water level rises as you study, and the timer persists across tabs and window refreshes!
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {!isTimerRunning ? (
                <button
                  onClick={() => {
                    Haptics.tap();
                    startTimer();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl liquid-btn text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-transform cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Focus Timer</span>
                </button>
              ) : (
                <div className="flex-1 py-2 px-3 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-bold flex items-center justify-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  <span>Timer Running!</span>
                </div>
              )}

              <button
                onClick={() => {
                  Haptics.tap();
                  nextTourStep();
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next: Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: The Analytics Tab */}
        {tourStep === 3 && (
          <div className="space-y-3.5 relative z-10 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-md">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  3. The Analytics Tab
                </h3>
                <p className="text-[11px] text-cyan-300 font-medium">
                  Hover for hours, click to inspect completed tasks
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Explore your study metrics! <strong className="text-white">Hover over any day cell</strong> to see how many hours you studied, and <strong className="text-white">click any day</strong> to view all completed tasks and logged sessions.
            </p>

            <div className="pt-1">
              <button
                onClick={() => {
                  Haptics.success();
                  completeTour();
                }}
                className="w-full py-2.5 px-4 rounded-xl liquid-btn text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-xl shadow-teal-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-aqua-300 animate-spin-slow" />
                <span>Finish Tour & Start Studying</span>
              </button>
            </div>
          </div>
        )}

        {/* Stepper Progress Dots */}
        <div className="flex items-center justify-center space-x-2 mt-4 pt-3 border-t border-teal-500/20">
          {[1, 2, 3].map(step => (
            <button
              key={step}
              onClick={() => {
                Haptics.tap();
                setTourStep(step as 1 | 2 | 3);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                step === tourStep
                  ? 'w-6 bg-gradient-to-r from-teal-400 to-cyan-400 shadow-sm shadow-teal-400/50'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Step ${step}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
