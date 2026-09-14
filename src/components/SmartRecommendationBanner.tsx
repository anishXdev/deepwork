import React from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Sparkles, TrendingUp, Target, CheckCircle2, ChevronRight, Clock, CalendarDays, Zap } from 'lucide-react';

export const SmartRecommendationBanner: React.FC = () => {
  const { sessions, settings, setActiveTab } = useApp();

  const recommendation = AnalyticsService.getSmartPacingRecommendation(
    settings.weeklyHoursTarget,
    sessions,
    settings.weekStartsOnMonday
  );

  const getStatusBadge = () => {
    switch (recommendation.status) {
      case 'achieved':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          symbol: '🎉 Done'
        };
      case 'ahead':
        return {
          icon: TrendingUp,
          color: 'text-sky-500 dark:text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/20',
          symbol: '🚀 Ahead'
        };
      case 'behind':
        return {
          icon: Target,
          color: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          symbol: '⚡ Boost'
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-indigo-500 dark:text-indigo-400',
          bg: 'bg-indigo-500/10 border-indigo-500/20',
          symbol: '✨ On Track'
        };
    }
  };

  const badge = getStatusBadge();
  const percentComplete = Math.min(
    100,
    Math.round((recommendation.hoursStudiedThisWeek / recommendation.weeklyTarget) * 100)
  );

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 mb-6 relative overflow-hidden transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Key Metrics with minimal text and bold symbols */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          
          {/* Daily Pace Gauge */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 flex-shrink-0">
              <Zap className="w-4 h-4 fill-indigo-500" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Pace Target</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${badge.bg} ${badge.color}`}>
                  {badge.symbol}
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.recommendedDailyHours}<span className="text-xs font-normal text-slate-500 dark:text-slate-400">h / day</span>
              </div>
            </div>
          </div>

          {/* Weekly Progress Ring / Metric */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Week Progress
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.hoursStudiedThisWeek}<span className="text-xs text-slate-400">/{recommendation.weeklyTarget}h</span>
                <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-1.5 font-sans font-semibold">({percentComplete}%)</span>
              </div>
            </div>
          </div>

          {/* Days & Hours Remaining */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 flex-shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Remaining
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-slate-800 dark:text-slate-100">
                {recommendation.hoursRemaining}h <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({recommendation.daysRemainingInWeek}d left)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Action: 1-click Graph View */}
        <button
          onClick={() => setActiveTab('analytics')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300/80 dark:border-slate-700 transition-colors self-end md:self-center"
        >
          <span>📊 Insights</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

      </div>

      {/* Slim visual gradient progress track */}
      <div className="mt-3.5 w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-300/50 dark:border-slate-800">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${percentComplete}%` }}
        />
      </div>
    </div>
  );
};
