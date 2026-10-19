import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnalyticsService } from '../services/analytics';
import { Sparkles, TrendingUp, Target, CheckCircle2, ChevronRight, CalendarDays, Zap, Award, Settings2, CalendarPlus, GraduationCap } from 'lucide-react';
import { GATE_STREAM_SYLLABUS } from '../types';

export const SmartRecommendationBanner: React.FC = () => {
  const { sessions, settings, updateSettings, setActiveTab, loadGateStreamSyllabus, setStudyMode } = useApp();
  const [isEditingExamConfig, setIsEditingExamConfig] = useState(false);

  const isGatePrep = Boolean(settings.isGatePrep);
  const examDateStr = settings.gateExamDate || (isGatePrep ? '2027-02-06' : '');
  const targetStream = settings.gateTargetStream || 'CSE';
  const targetAir = settings.gateTargetAir || 'AIR < 100';
  const customExamName = settings.examName || 'Target Exam';

  const getDaysUntilExam = () => {
    if (!examDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr + 'T00:00:00');
    if (isNaN(examDate.getTime())) return null;
    const diffMs = examDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const daysUntilExam = getDaysUntilExam();

  const recommendation = AnalyticsService.getSmartPacingRecommendation(
    settings.weeklyHoursTarget,
    sessions,
    settings.weekStartsOnMonday
  );

  const getStatusBadge = () => {
    switch (recommendation.status) {
      case 'achieved':
        return { color: '#10b981', symbol: '✓ Done' };
      case 'ahead':
        return { color: '#3b82f6', symbol: '↑ Ahead' };
      case 'behind':
        return { color: '#f59e0b', symbol: '⚡ Boost' };
      default:
        return { color: 'var(--accent)', symbol: '· On Track' };
    }
  };

  const badge = getStatusBadge();
  const percentComplete = Math.min(
    100,
    Math.round((recommendation.hoursStudiedThisWeek / recommendation.weeklyTarget) * 100)
  );

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        {/* Left: Metrics */}
        <div className="flex flex-wrap items-center gap-5 sm:gap-7">

          {/* Exam Countdown */}
          <div
            onClick={() => setIsEditingExamConfig(!isEditingExamConfig)}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Click to configure exam date or toggle GATE mode"
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isGatePrep ? 'rgba(180,83,9,0.12)' : 'rgba(180,83,9,0.08)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              {daysUntilExam !== null ? <Award className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isGatePrep ? (
                  <>
                    <span>GATE {targetStream}</span>
                    <span style={{ padding: '0 5px', borderRadius: '4px', background: 'rgba(180,83,9,0.12)', border: '1px solid rgba(180,83,9,0.25)', fontSize: '9px', fontFamily: 'monospace' }}>{targetAir}</span>
                  </>
                ) : (
                  <span>{daysUntilExam !== null ? customExamName : 'Exam Countdown'}</span>
                )}
                <Settings2 className="w-2.5 h-2.5" style={{ opacity: 0.6 }} />
              </div>
              {daysUntilExam !== null ? (
                <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {daysUntilExam}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '3px' }}>days left</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }} className="group-hover:underline flex items-center gap-1 mt-0.5">
                  + Set Exam Date
                </div>
              )}
            </div>
          </div>

          {/* Daily Pace */}
          <div className="flex items-center gap-2.5">
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(180,83,9,0.08)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Daily Pace</span>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', padding: '0 5px', borderRadius: '4px', background: 'rgba(180,83,9,0.1)', color: badge.color, border: `1px solid ${badge.color}33` }}>{badge.symbol}</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {recommendation.recommendedDailyHours}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>h / day</span>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="flex items-center gap-2.5">
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981', flexShrink: 0
            }}>
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Week Target</div>
              <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {recommendation.hoursStudiedThisWeek}<span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{recommendation.weeklyTarget}h</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginLeft: '6px', fontFamily: 'sans-serif' }}>({percentComplete}%)</span>
              </div>
            </div>
          </div>

          {/* Remaining */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(180,83,9,0.06)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0
            }}>
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Week Left</div>
              <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {recommendation.hoursRemaining}h <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>({recommendation.daysRemainingInWeek}d)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            type="button"
            onClick={() => setStudyMode(!isGatePrep, targetStream)}
            title={isGatePrep ? 'Switch to Simple Study Mode' : 'Preparing for GATE? Enable GATE Prep Mode'}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
              border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              background: isGatePrep ? 'var(--accent-soft)' : 'var(--bg-card)',
              color: isGatePrep ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{isGatePrep ? 'GATE Mode: ON' : 'GATE Prep?'}</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
              border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
            }}
          >
            <span>📊 {isGatePrep ? 'GATE Insights' : 'Insights'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Config Drawer */}
      {isEditingExamConfig && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
              📅 Exam Countdown & Mode Settings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStudyMode(false)}
                style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  background: !isGatePrep ? 'var(--accent)' : 'var(--bg-card-alt)',
                  color: !isGatePrep ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                📚 Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setStudyMode(true, targetStream)}
                style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  background: isGatePrep ? 'var(--accent)' : 'var(--bg-card-alt)',
                  color: isGatePrep ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                🎓 GATE Exam Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Date of Exam
              </label>
              <input
                type="date"
                value={examDateStr}
                onChange={e => updateSettings({ gateExamDate: e.target.value })}
                className="input-base w-full"
              />
            </div>

            {isGatePrep ? (
              <>
                <div>
                  <label className="block mb-1" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    GATE Stream & Syllabus
                  </label>
                  <select
                    value={targetStream}
                    onChange={e => {
                      const newStream = e.target.value;
                      updateSettings({ gateTargetStream: newStream });
                      loadGateStreamSyllabus(newStream, false);
                    }}
                    className="input-base w-full"
                  >
                    {Object.entries(GATE_STREAM_SYLLABUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Target Rank / Score
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AIR < 100"
                    value={targetAir}
                    onChange={e => updateSettings({ gateTargetAir: e.target.value })}
                    className="input-base w-full"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block mb-1" style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Exam Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Semester Finals, CAT, Placement Prep..."
                  value={settings.examName || ''}
                  onChange={e => updateSettings({ examName: e.target.value })}
                  className="input-base w-full"
                />
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setIsEditingExamConfig(false)}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Progress Bar */}
      <div style={{ marginTop: '14px', width: '100%', height: '4px', borderRadius: '9999px', background: 'var(--bg-card-alt)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${percentComplete}%`,
            background: 'var(--accent)',
            borderRadius: '9999px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};
