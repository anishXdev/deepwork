export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Subject {
  id: string;
  name: string;
  color: string; // Hex color or Tailwind accent
  icon?: string;
  weeklyTargetHours?: number;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  approxHours: number; // e.g. 1.5
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  completedHours: number; // accumulated hours
  status: TaskStatus;
  notes?: string;
  gcalEventId?: string; // Google Calendar Event ID if synced
  gcalLink?: string; // Web link to view event in Google Calendar
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number; // exact minutes
  durationHours: number; // durationMinutes / 60
  mode: 'pomodoro' | 'short_break' | 'long_break' | 'custom';
  completed: boolean;
  notes?: string;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  googleConnected: boolean;
  googleCalendarSyncEnabled: boolean;
  googleAccessToken?: string;
  syncKey?: string; // 6-character room key for instant cross-device sync
  lastSyncedAt?: string;
}

export interface UserSettings {
  weeklyHoursTarget: number; // e.g. 25
  pomodoroWorkMinutes: number; // default 25
  pomodoroBreakMinutes: number; // default 5
  pomodoroLongBreakMinutes: number; // default 15
  autoStartBreaks: boolean;
  soundEnabled: boolean;
  ambientSound: 'none' | 'rain' | 'whitenoise' | 'deepfocus';
  weekStartsOnMonday: boolean;
  theme: 'dark' | 'light';
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  activityHistory: Record<string, number>; // dateString -> hours studied
}

export interface PacingRecommendation {
  weeklyTarget: number;
  hoursStudiedThisWeek: number;
  hoursRemaining: number;
  daysRemainingInWeek: number;
  recommendedDailyHours: number;
  status: 'ahead' | 'on_track' | 'behind' | 'achieved';
  message: string;
}
