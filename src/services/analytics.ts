import { StudySession, Subject, PacingRecommendation, StreakData } from '../types';

export const AnalyticsService = {
  /**
   * Returns current day in YYYY-MM-DD
   */
  getTodayDateString(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  },

  /**
   * Returns tomorrow date in YYYY-MM-DD
   */
  getTomorrowDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  /**
   * Computes the start of the week (Monday or Sunday)
   */
  getWeekStartDate(weekStartsOnMonday = true): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (weekStartsOnMonday ? (day === 0 ? -6 : 1) : 0);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  },

  /**
   * Returns total hours studied today
   */
  getHoursStudiedToday(sessions: StudySession[]): number {
    const todayStr = this.getTodayDateString();
    const todaySessions = sessions.filter(s => {
      if (s.activityType === 'meeting') return false;
      if (!s.startTime) return false;
      return s.startTime.startsWith(todayStr);
    });

    const totalHours = todaySessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0);
    return Math.round(totalHours * 10) / 10;
  },

  /**
   * Returns total hours studied in the current week
   */
  getHoursStudiedThisWeek(sessions: StudySession[], weekStartsOnMonday = true): number {
    const weekStart = this.getWeekStartDate(weekStartsOnMonday);
    const weekSessions = sessions.filter(s => {
      if (s.activityType === 'meeting') return false;
      if (!s.startTime) return false;
      const sessionDate = new Date(s.startTime);
      return sessionDate >= weekStart;
    });

    const totalHours = weekSessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0);
    return Math.round(totalHours * 10) / 10;
  },

  /**
   * Returns total hours studied broken down by subject
   */
  getSubjectHoursBreakdown(
    subjects: Subject[],
    sessions: StudySession[],
    timeframe: 'all' | 'week' | 'today' = 'all',
    weekStartsOnMonday = true
  ): { subjectId: string; subjectName: string; color: string; hours: number; percentage: number }[] {
    let filteredSessions = sessions.filter(s => s.activityType !== 'meeting');
    const todayStr = this.getTodayDateString();
    const weekStart = this.getWeekStartDate(weekStartsOnMonday);

    if (timeframe === 'today') {
      filteredSessions = filteredSessions.filter(s => s.startTime && s.startTime.startsWith(todayStr));
    } else if (timeframe === 'week') {
      filteredSessions = filteredSessions.filter(s => s.startTime && new Date(s.startTime) >= weekStart);
    }

    const totalHoursOverall = filteredSessions.reduce(
      (acc, s) => acc + (s.durationHours || s.durationMinutes / 60),
      0
    );

    const breakdown = subjects.filter(Boolean).map(sub => {
      const subSessions = filteredSessions.filter(s => s && s.subjectId === sub.id);
      const hours = subSessions.reduce(
        (acc, s) => acc + (s.durationHours || s.durationMinutes / 60),
        0
      );
      const roundedHours = Math.round(hours * 10) / 10;
      const percentage = totalHoursOverall > 0 ? Math.round((hours / totalHoursOverall) * 100) : 0;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        color: sub?.color || '#0d9488',
        hours: roundedHours,
        percentage
      };
    });

    return breakdown.sort((a, b) => b.hours - a.hours);
  },

  /**
   * Computes the smart recommendation:
   * Target pace = (Weekly Target - Studied this week) / (Remaining days in week, including today)
   */
  getSmartPacingRecommendation(
    weeklyTarget: number,
    sessions: StudySession[],
    weekStartsOnMonday = true
  ): PacingRecommendation {
    const hoursStudied = this.getHoursStudiedThisWeek(sessions, weekStartsOnMonday);
    const hoursRemaining = Math.max(0, Math.round((weeklyTarget - hoursStudied) * 10) / 10);

    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    
    // Remaining days including today:
    // If week ends on Sunday:
    // Monday = 7 days left, Tuesday = 6, ..., Sunday = 1 day left
    let daysRemaining = 1;
    if (weekStartsOnMonday) {
      const currentIsoDay = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
      daysRemaining = Math.max(1, 7 - currentIsoDay + 1);
    } else {
      // Sunday-based: Sunday = 7 days left, Saturday = 1 day left
      daysRemaining = Math.max(1, 7 - currentDayOfWeek);
    }

    const recommendedDailyHours = hoursRemaining > 0 
      ? Math.round((hoursRemaining / daysRemaining) * 10) / 10 
      : 0;

    let status: 'ahead' | 'on_track' | 'behind' | 'achieved' = 'on_track';
    let message = '';

    if (hoursRemaining <= 0) {
      status = 'achieved';
      message = `🎯 Goal achieved! You've completed ${hoursStudied}h of your ${weeklyTarget}h weekly target. Keep pushing your limits!`;
    } else {
      const expectedPacedHoursByNow = ((7 - daysRemaining) / 7) * weeklyTarget;
      if (hoursStudied >= expectedPacedHoursByNow + 1.0) {
        status = 'ahead';
        message = `🔥 You're ahead of pace! Study approx ${recommendedDailyHours}h/day across the next ${daysRemaining} days to easily clear your goal.`;
      } else if (hoursStudied < expectedPacedHoursByNow - 1.5) {
        status = 'behind';
        message = `⚡ Ramp up: You need ${recommendedDailyHours}h/day over the remaining ${daysRemaining} days to achieve your ${weeklyTarget}h weekly target.`;
      } else {
        status = 'on_track';
        message = `✨ On track: Studying ${recommendedDailyHours}h/day for the next ${daysRemaining} days will achieve your weekly target.`;
      }
    }

    return {
      weeklyTarget,
      hoursStudiedThisWeek: hoursStudied,
      hoursRemaining,
      daysRemainingInWeek: daysRemaining,
      recommendedDailyHours,
      status,
      message
    };
  },

  /**
   * Updates streak after a study session is logged
   */
  updateStreakOnSession(currentStreakData: StreakData, sessionHours: number): StreakData {
    const todayStr = this.getTodayDateString();
    const history = { ...currentStreakData.activityHistory };
    
    history[todayStr] = (history[todayStr] || 0) + sessionHours;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newCurrentStreak = currentStreakData.currentStreak;

    if (currentStreakData.lastActiveDate === todayStr) {
      // Already credited for today
      newCurrentStreak = Math.max(1, currentStreakData.currentStreak);
    } else if (currentStreakData.lastActiveDate === yesterdayStr) {
      // Continuing streak from yesterday!
      newCurrentStreak = currentStreakData.currentStreak + 1;
    } else if (!currentStreakData.lastActiveDate) {
      // Starting brand new streak
      newCurrentStreak = 1;
    } else {
      // Missed more than a day, resets to 1
      newCurrentStreak = 1;
    }

    const longestStreak = Math.max(currentStreakData.longestStreak, newCurrentStreak);

    return {
      currentStreak: newCurrentStreak,
      longestStreak,
      lastActiveDate: todayStr,
      activityHistory: history
    };
  },

  /**
   * Generates daily history for the last N days
   */
  getDailyHistory(sessions: StudySession[], daysCount = 7): { date: string; label: string; hours: number }[] {
    const result = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Yday' : `${dayNames[d.getDay()]}`;

      const daySessions = sessions.filter(s => s.activityType !== 'meeting' && s.startTime && s.startTime.startsWith(dateStr));
      const hours = daySessions.reduce((acc, s) => acc + (s.durationHours || s.durationMinutes / 60), 0);

      result.push({
        date: dateStr,
        label,
        hours: Math.round(hours * 10) / 10
      });
    }

    return result;
  }
};
