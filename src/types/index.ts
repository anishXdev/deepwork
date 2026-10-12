export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface SubjectColor {
  hex: string;
  name: string;
}

export const SUBJECT_PALETTE: SubjectColor[] = [
  { hex: '#0d9488', name: 'Ocean Teal' },
  { hex: '#06b6d4', name: 'Aqua Cyan' },
  { hex: '#0284c7', name: 'Sky Wave' },
  { hex: '#3b82f6', name: 'Cobalt Blue' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Electric Violet' },
  { hex: '#a855f7', name: 'Bright Purple' },
  { hex: '#d946ef', name: 'Neon Fuchsia' },
  { hex: '#ec4899', name: 'Rose Quartz' },
  { hex: '#f43f5e', name: 'Coral Pink' },
  { hex: '#ef4444', name: 'Ruby Crimson' },
  { hex: '#f97316', name: 'Deep Orange' },
  { hex: '#f59e0b', name: 'Solar Amber' },
  { hex: '#eab308', name: 'Golden Sun' },
  { hex: '#84cc16', name: 'Lime Green' },
  { hex: '#10b981', name: 'Emerald Gem' },
  { hex: '#14b8a6', name: 'Turquoise' },
  { hex: '#0f766e', name: 'Dark Teal' },
  { hex: '#64748b', name: 'Steel Slate' },
  { hex: '#fb7185', name: 'Watermelon' },
];

export const PRESET_COLORS = SUBJECT_PALETTE.map(c => c.hex);

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
export type TimerMode = 'work' | 'break' | 'long_break';
export type AmbientSoundType = 'none' | 'ocean' | 'stream' | 'rain';

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

export type AppSettings = UserSettings;

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
