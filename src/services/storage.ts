import { Subject, Topic, StudySession, UserSettings, UserProfile, StreakData } from '../types';

const STORAGE_KEYS = {
  SUBJECTS: 'studypulse_subjects',
  TOPICS: 'studypulse_topics',
  SESSIONS: 'studypulse_sessions',
  SETTINGS: 'studypulse_settings',
  PROFILE: 'studypulse_profile',
  STREAKS: 'studypulse_streaks',
  LAST_SYNC: 'studypulse_last_sync',
  INITIALIZED: 'studypulse_initialized',
  SYNC_ROOM: 'studypulse_sync_room'
};

export const DEFAULT_SETTINGS: UserSettings = {
  weeklyHoursTarget: 20,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  autoStartBreaks: false,
  soundEnabled: true,
  ambientSound: 'none',
  weekStartsOnMonday: true,
  theme: 'dark'
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user_default',
  name: 'Focus Scholar',
  email: 'learner@example.com',
  googleConnected: false,
  googleCalendarSyncEnabled: true,
  syncKey: ''
};

// Seed realistic starter data if app is opened for the first time
export function getInitialStarterData() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const subjects: Subject[] = [
    {
      id: 'sub_1',
      name: 'Computer Architecture',
      color: '#0d9488', // Ocean Teal
      weeklyTargetHours: 8,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub_2',
      name: 'Algorithms & Data Structures',
      color: '#38bdf8', // Sky
      weeklyTargetHours: 7,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub_3',
      name: 'Database Systems',
      color: '#10b981', // Emerald
      weeklyTargetHours: 5,
      createdAt: new Date().toISOString()
    }
  ];

  const topics: Topic[] = [];
  const sessions: StudySession[] = [];

  const streakData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    activityHistory: {}
  };

  return { subjects, topics, sessions, streakData };
}

export const StorageService = {
  ensureInitialized() {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const init = getInitialStarterData();
      this.saveSubjects(init.subjects);
      this.saveTopics(init.topics);
      this.saveSessions(init.sessions);
      this.saveStreaks(init.streakData);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  resetToCleanSlate() {
    this.saveTopics([]);
    this.saveSessions([]);
    this.saveStreaks({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activityHistory: {}
    });
    localStorage.removeItem('dstudy_interactive_tour_completed');
  },

  getSubjects(): Subject[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSubjects(subjects: Subject[]) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  getTopics(): Topic[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTopics(topics: Topic[]) {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  },

  getSessions(): StudySession[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSessions(sessions: StudySession[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getSettings(): UserSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getProfile(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getStreaks(): StreakData {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.STREAKS);
    try {
      return raw ? JSON.parse(raw) : { currentStreak: 0, longestStreak: 0, lastActiveDate: null, activityHistory: {} };
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, activityHistory: {} };
    }
  },

  saveStreaks(streaks: StreakData) {
    localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify(streaks));
  },

  /**
   * Clears all sample data and resets to an empty, clean slate.
   * Prevents automatic re-seeding on reload.
   */
  clearSampleData() {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    this.saveSubjects([]);
    this.saveTopics([]);
    this.saveSessions([]);
    const resetStreaks: StreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      activityHistory: {}
    };
    this.saveStreaks(resetStreaks);
    return {
      subjects: [],
      topics: [],
      sessions: [],
      streaks: resetStreaks
    };
  },

  /**
   * Resets current streak to 0, optionally preserving longest streak history.
   */
  resetStreak(keepLongest = true): StreakData {
    const current = this.getStreaks();
    const updated: StreakData = {
      currentStreak: 0,
      longestStreak: keepLongest ? current.longestStreak : 0,
      lastActiveDate: null,
      activityHistory: current.activityHistory || {}
    };
    this.saveStreaks(updated);
    return updated;
  },

  /**
   * Manually sets or restores streak to a specific number of days.
   */
  setManualStreak(streakDays: number, longestDays?: number): StreakData {
    const current = this.getStreaks();
    const targetCurrent = Math.max(0, Math.floor(streakDays));
    const targetLongest = Math.max(
      current.longestStreak || 0,
      longestDays !== undefined ? Math.floor(longestDays) : targetCurrent
    );
    const todayStr = new Date().toISOString().split('T')[0];
    const updated: StreakData = {
      currentStreak: targetCurrent,
      longestStreak: targetLongest,
      lastActiveDate: targetCurrent > 0 ? todayStr : null,
      activityHistory: current.activityHistory || {}
    };
    this.saveStreaks(updated);
    return updated;
  },

  exportAllData() {
    return {
      subjects: this.getSubjects(),
      topics: this.getTopics(),
      sessions: this.getSessions(),
      settings: this.getSettings(),
      profile: this.getProfile(),
      streaks: this.getStreaks(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  },

  importData(jsonData: any) {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    if (jsonData.subjects) this.saveSubjects(jsonData.subjects);
    if (jsonData.topics) this.saveTopics(jsonData.topics);
    if (jsonData.sessions) this.saveSessions(jsonData.sessions);
    if (jsonData.settings) this.saveSettings(jsonData.settings);
    if (jsonData.profile) this.saveProfile(jsonData.profile);
    if (jsonData.streaks) this.saveStreaks(jsonData.streaks);
  }
};
