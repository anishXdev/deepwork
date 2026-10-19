import {
  Subject,
  Topic,
  Task,
  Tag,
  DEFAULT_TAG_PALETTE,
  StudySession,
  UserSettings,
  UserProfile,
  StreakData,
  StudyBoard,
  UserGamification,
  WhiteboardElement,
  GATE_STREAM_SYLLABUS
} from '../types';

const SCHEMA_VERSION = 2;

const STORAGE_KEYS = {
  SCHEMA_VERSION: 'studypulse_schema_version',
  BACKUPS: 'studypulse_backups',
  TAGS: 'studypulse_tags',
  SUBJECTS: 'studypulse_subjects',
  TOPICS: 'studypulse_topics',
  SESSIONS: 'studypulse_sessions',
  SETTINGS: 'studypulse_settings',
  PROFILE: 'studypulse_profile',
  STREAKS: 'studypulse_streaks',
  LAST_SYNC: 'studypulse_last_sync',
  INITIALIZED: 'studypulse_initialized',
  SYNC_ROOM: 'studypulse_sync_room',
  BOARDS: 'studypulse_boards',
  ACTIVE_BOARD: 'studypulse_active_board',
  GAMIFICATION: 'studypulse_gamification',
  WHITEBOARD: 'studypulse_whiteboard_data',
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
  theme: 'dark',
  isGatePrep: false,
  examName: '',
  gateExamDate: '',
  gateTargetStream: 'CSE',
  gateTargetAir: 'AIR < 100'
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user_default',
  name: 'Alex Rivera',
  email: 'alex@dstudy.app',
  googleConnected: false,
  googleCalendarSyncEnabled: true,
  syncKey: ''
};

export function getSimpleStarterSubjects(): Subject[] {
  return [
    { id: 'sub_1', name: 'Core Work', color: '#0d9488', createdAt: new Date().toISOString() },
    { id: 'sub_2', name: 'Problem Solving', color: '#06b6d4', createdAt: new Date().toISOString() },
    { id: 'sub_3', name: 'Review & Notes', color: '#8b5cf6', createdAt: new Date().toISOString() },
  ];
}

export function getGateStarterSubjects(streamKey = 'CSE'): Subject[] {
  const stream = GATE_STREAM_SYLLABUS[streamKey] || GATE_STREAM_SYLLABUS.CSE;
  return stream.subjects.map((preset, idx) => ({
    id: `sub_gate_${idx + 1}`,
    name: preset.name,
    color: preset.color,
    weeklyTargetHours: preset.weeklyTargetHours,
    examWeightageMarks: preset.examWeightageMarks,
    highYieldTopics: preset.highYieldTopics,
    createdAt: new Date().toISOString()
  }));
}

export function getDefaultTags(): Tag[] {
  return DEFAULT_TAG_PALETTE.map(t => ({
    id: t.id,
    name: t.name,
    color: t.color,
    icon: t.icon,
    createdAt: new Date().toISOString()
  }));
}

export function getDefaultBoards(): StudyBoard[] {
  return [
    {
      id: 'board_default',
      name: 'Tasks & Projects',
      description: 'Universal task management for internships, hackathons, coding & study',
      color: '#0C66E4',
      icon: '⚡',
      isDefault: true,
      members: [
        { id: 'member_me', name: 'You (Owner)', email: 'you@dstudy.app', color: '#0C66E4', role: 'owner' },
        { id: 'member_alex', name: 'Alex Rivera', email: 'alex@startup.io', color: '#10B981', role: 'editor' },
        { id: 'member_priya', name: 'Priya Sharma', email: 'priya@hackathon.dev', color: '#8B5CF6', role: 'editor' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'board_internship',
      name: 'Internship & Career',
      description: 'Tickets, PR reviews, features & deliverables',
      color: '#10B981',
      icon: '💼',
      isDefault: false,
      members: [
        { id: 'member_me', name: 'You (Owner)', email: 'you@dstudy.app', color: '#0C66E4', role: 'owner' },
        { id: 'member_alex', name: 'Alex Rivera', email: 'alex@startup.io', color: '#10B981', role: 'editor' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'board_hackathon',
      name: 'Hackathon Sprint',
      description: 'MVP features, system architecture, presentation & demo prep',
      color: '#8B5CF6',
      icon: '🚀',
      isDefault: false,
      members: [
        { id: 'member_me', name: 'You (Owner)', email: 'you@dstudy.app', color: '#0C66E4', role: 'owner' },
        { id: 'member_priya', name: 'Priya Sharma', email: 'priya@hackathon.dev', color: '#8B5CF6', role: 'editor' },
      ],
      createdAt: new Date().toISOString(),
    }
  ];
}

export const StorageService = {
  /**
   * Initializes and safely migrates legacy data without any data loss.
   */
  ensureInitialized() {
    try {
      const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      const currentVersion = parseInt(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION) || '1', 10);

      // Perform automatic backup before any migration
      if (isInit && currentVersion < SCHEMA_VERSION) {
        this.createAutomaticSnapshot(`pre_v${SCHEMA_VERSION}_migration`);
      }

      // Check for tags
      const rawTags = localStorage.getItem(STORAGE_KEYS.TAGS);
      if (!rawTags) {
        // If legacy subjects exist, convert them to tags!
        const rawSubjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
        let migratedTags: Tag[] = getDefaultTags();
        if (rawSubjects) {
          try {
            const parsedSubjects: Subject[] = JSON.parse(rawSubjects);
            if (Array.isArray(parsedSubjects) && parsedSubjects.length > 0) {
              const converted: Tag[] = parsedSubjects.map(s => ({
                id: s.id,
                name: s.name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().toLowerCase().replace(/\s+/g, '-'),
                color: s.color || '#0C66E4',
                icon: '🏷️',
                createdAt: s.createdAt || new Date().toISOString()
              }));
              migratedTags = [...converted, ...migratedTags];
            }
          } catch {
            // fallback
          }
        }
        this.saveTags(migratedTags);
      }

      // Ensure topics have tags populated from subjectId if missing
      const rawTopics = localStorage.getItem(STORAGE_KEYS.TOPICS);
      if (rawTopics) {
        try {
          const parsedTopics = JSON.parse(rawTopics);
          if (Array.isArray(parsedTopics)) {
            let updated = false;
            const migratedTopics = parsedTopics.map((t: any) => {
              if (!t.tags || t.tags.length === 0) {
                updated = true;
                return {
                  ...t,
                  tags: t.subjectId ? [t.subjectId] : ['tag_project'],
                  priority: t.priority || 'normal'
                };
              }
              return t;
            });
            if (updated) {
              this.saveTopics(migratedTopics);
            }
          }
        } catch {
          // ignore
        }
      }

      // Ensure default boards
      const rawBoards = localStorage.getItem(STORAGE_KEYS.BOARDS);
      if (!rawBoards) {
        const defBoards = getDefaultBoards();
        this.saveBoards(defBoards);
        this.saveActiveBoardId(defBoards[0].id);
      }

      // Ensure Gamification
      if (!localStorage.getItem(STORAGE_KEYS.GAMIFICATION)) {
        this.saveGamification({
          xp: 120,
          level: 1,
          levelTitle: 'Apprentice Creator',
          totalMinutesFocused: 0,
          totalTasksCompleted: 0
        });
      }

      // Mark initialized & current schema version
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
    } catch (e) {
      console.warn('StorageService.ensureInitialized warning:', e);
    }
  },

  /**
   * Creates an immutable backup snapshot in localStorage
   */
  createAutomaticSnapshot(reason = 'auto') {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        reason,
        version: SCHEMA_VERSION,
        data: this.exportAllData()
      };
      const raw = localStorage.getItem(STORAGE_KEYS.BACKUPS);
      const backups = raw ? JSON.parse(raw) : [];
      backups.unshift(snapshot);
      // Keep last 5 snapshots to conserve quota
      localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups.slice(0, 5)));
    } catch (e) {
      console.warn('Automatic snapshot skipped:', e);
    }
  },

  /* ── Tags Operations ────────────────────────────────────────── */
  getTags(): Tag[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.TAGS);
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const def = getDefaultTags();
      this.saveTags(def);
      return def;
    } catch {
      return getDefaultTags();
    }
  },

  saveTags(tags: Tag[]) {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
  },

  addTag(name: string, color = '#0C66E4', icon = '🏷️'): Tag {
    const cleanName = name.trim().toLowerCase().replace(/^#+/, '');
    const tags = this.getTags();
    const existing = tags.find(t => t.name === cleanName);
    if (existing) return existing;

    const newTag: Tag = {
      id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      color,
      icon,
      createdAt: new Date().toISOString()
    };
    this.saveTags([...tags, newTag]);
    return newTag;
  },

  deleteTag(id: string) {
    const tags = this.getTags().filter(t => t.id !== id);
    this.saveTags(tags);
  },

  /* ── Legacy Subjects (retained for backward compatibility) ── */
  getSubjects(): Subject[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    try {
      if (raw) return JSON.parse(raw);
      // Fallback: derive from tags
      return this.getTags().map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        icon: t.icon,
        createdAt: t.createdAt
      }));
    } catch {
      return [];
    }
  },

  saveSubjects(subjects: Subject[]) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  /* ── Tasks / Topics Operations ─────────────────────────────── */
  getTopics(): Task[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTopics(topics: Task[]) {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  },

  /* ── Study / Focus Sessions ────────────────────────────────── */
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

  /* ── Settings & Profile ────────────────────────────────────── */
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

  /* ── Boards Operations ─────────────────────────────────────── */
  getBoards(): StudyBoard[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.BOARDS);
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const def = getDefaultBoards();
      this.saveBoards(def);
      return def;
    } catch {
      return getDefaultBoards();
    }
  },

  saveBoards(boards: StudyBoard[]) {
    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards));
  },

  getActiveBoardId(): string {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_BOARD);
    if (raw) return raw;
    const boards = this.getBoards();
    const id = boards[0]?.id || 'board_default';
    this.saveActiveBoardId(id);
    return id;
  },

  saveActiveBoardId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BOARD, id);
  },

  /* ── Streaks ───────────────────────────────────────────────── */
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

  clearSampleData() {
    this.saveTopics([]);
    this.saveSessions([]);
    const reset = this.resetStreak(false);
    return {
      subjects: this.getSubjects(),
      topics: [],
      sessions: [],
      streaks: reset
    };
  },

  resetToCleanSlate(isGatePrep = false) {
    this.saveTopics([]);
    this.saveSessions([]);
    this.resetStreak(false);
  },

  /* ── Gamification & XP System ──────────────────────────────── */
  getGamification(): UserGamification {
    const raw = localStorage.getItem(STORAGE_KEYS.GAMIFICATION);
    if (!raw) {
      return {
        xp: 120,
        level: 1,
        levelTitle: 'Apprentice Creator',
        totalMinutesFocused: 0,
        totalTasksCompleted: 0
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        xp: 120,
        level: 1,
        levelTitle: 'Apprentice Creator',
        totalMinutesFocused: 0,
        totalTasksCompleted: 0
      };
    }
  },

  saveGamification(data: UserGamification) {
    localStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(data));
  },

  addXp(amount: number): { data: UserGamification; leveledUp: boolean } {
    const current = this.getGamification();
    const newXp = current.xp + amount;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 80)) + 1);
    const leveledUp = newLevel > current.level;

    const titles = [
      'Apprentice Creator',
      'Focused Builder',
      'Flow Strategist',
      'System Architect',
      'Execution Master',
      'Deep Work Titan',
      '10x Grandmaster'
    ];
    const levelTitle = titles[Math.min(titles.length - 1, newLevel - 1)];

    const updated: UserGamification = {
      ...current,
      xp: newXp,
      level: newLevel,
      levelTitle
    };
    this.saveGamification(updated);
    return { data: updated, leveledUp };
  },

  /* ── Offline Whiteboard Data ───────────────────────────────── */
  getWhiteboardElements(boardId = 'default'): WhiteboardElement[] {
    const raw = localStorage.getItem(`${STORAGE_KEYS.WHITEBOARD}_${boardId}`);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveWhiteboardElements(boardId = 'default', elements: WhiteboardElement[]) {
    localStorage.setItem(`${STORAGE_KEYS.WHITEBOARD}_${boardId}`, JSON.stringify(elements));
  },

  /* ── Full Backup Export & Import ───────────────────────────── */
  exportAllData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tags: this.getTags(),
      boards: this.getBoards(),
      tasks: this.getTopics(),
      sessions: this.getSessions(),
      settings: this.getSettings(),
      profile: this.getProfile(),
      streaks: this.getStreaks(),
      gamification: this.getGamification(),
      version: '2.0.0-robust'
    };
  },

  importData(jsonData: any): boolean {
    try {
      // Create rollback snapshot before overwriting
      this.createAutomaticSnapshot('pre_manual_import');

      if (jsonData.tags) this.saveTags(jsonData.tags);
      if (jsonData.boards) this.saveBoards(jsonData.boards);
      if (jsonData.tasks) this.saveTopics(jsonData.tasks);
      if (jsonData.topics && !jsonData.tasks) this.saveTopics(jsonData.topics);
      if (jsonData.sessions) this.saveSessions(jsonData.sessions);
      if (jsonData.settings) this.saveSettings(jsonData.settings);
      if (jsonData.profile) this.saveProfile(jsonData.profile);
      if (jsonData.streaks) this.saveStreaks(jsonData.streaks);
      if (jsonData.gamification) this.saveGamification(jsonData.gamification);

      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
};
