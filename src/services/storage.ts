import { Subject, Topic, StudySession, UserSettings, UserProfile, StreakData } from '../types';

const STORAGE_KEYS = {
  SUBJECTS: 'studypulse_subjects',
  TOPICS: 'studypulse_topics',
  SESSIONS: 'studypulse_sessions',
  SETTINGS: 'studypulse_settings',
  PROFILE: 'studypulse_profile',
  STREAKS: 'studypulse_streaks',
  LAST_SYNC: 'studypulse_last_sync'
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
  googleCalendarSyncEnabled: true
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

  const topics: Topic[] = [
    {
      id: 'top_1',
      subjectId: 'sub_1',
      name: 'Pipelining & Branch Hazards',
      approxHours: 2.0,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
      completedHours: 0.8,
      status: 'in_progress',
      notes: 'Review classic 5-stage MIPS pipeline and forwarding paths.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_2',
      subjectId: 'sub_2',
      name: 'Dijkstra & A* Shortest Path',
      approxHours: 1.5,
      scheduledDate: todayStr,
      scheduledTime: '14:30',
      completedHours: 0,
      status: 'todo',
      notes: 'Implement priority queue based adjacency list solver.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'top_3',
      subjectId: 'sub_3',
      name: 'ACID Transactions & Two-Phase Locking',
      approxHours: 2.5,
      scheduledDate: tomorrowStr,
      scheduledTime: '11:00',
      completedHours: 0,
      status: 'todo',
      notes: 'Concurrency control anomalies and strict 2PL.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Seed yesterday & earlier today sessions for realistic streak & weekly progress
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sessions: StudySession[] = [
    {
      id: 'sess_1',
      subjectId: 'sub_1',
      topicId: 'top_1',
      startTime: `${todayStr}T09:00:00.000Z`,
      endTime: `${todayStr}T09:48:00.000Z`,
      durationMinutes: 48,
      durationHours: 0.8,
      mode: 'pomodoro',
      completed: true
    },
    {
      id: 'sess_2',
      subjectId: 'sub_2',
      startTime: `${yesterdayStr}T15:00:00.000Z`,
      endTime: `${yesterdayStr}T17:00:00.000Z`,
      durationMinutes: 120,
      durationHours: 2.0,
      mode: 'pomodoro',
      completed: true
    }
  ];

  const streakData: StreakData = {
    currentStreak: 3,
    longestStreak: 7,
    lastActiveDate: todayStr,
    activityHistory: {
      [todayStr]: 0.8,
      [yesterdayStr]: 2.0
    }
  };

  return { subjects, topics, sessions, streakData };
}

export const StorageService = {
  getSubjects(): Subject[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!raw) {
      const init = getInitialStarterData();
      this.saveSubjects(init.subjects);
      return init.subjects;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveSubjects(subjects: Subject[]) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  getTopics(): Topic[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    if (!raw) {
      const init = getInitialStarterData();
      this.saveTopics(init.topics);
      return init.topics;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveTopics(topics: Topic[]) {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  },

  getSessions(): StudySession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      const init = getInitialStarterData();
      this.saveSessions(init.sessions);
      return init.sessions;
    }
    try {
      return JSON.parse(raw);
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
    const raw = localStorage.getItem(STORAGE_KEYS.STREAKS);
    if (!raw) {
      const init = getInitialStarterData();
      this.saveStreaks(init.streakData);
      return init.streakData;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, activityHistory: {} };
    }
  },

  saveStreaks(streaks: StreakData) {
    localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify(streaks));
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
    if (jsonData.subjects) this.saveSubjects(jsonData.subjects);
    if (jsonData.topics) this.saveTopics(jsonData.topics);
    if (jsonData.sessions) this.saveSessions(jsonData.sessions);
    if (jsonData.settings) this.saveSettings(jsonData.settings);
    if (jsonData.profile) this.saveProfile(jsonData.profile);
    if (jsonData.streaks) this.saveStreaks(jsonData.streaks);
  }
};
