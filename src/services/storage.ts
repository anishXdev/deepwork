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
  GATE_STREAM_SYLLABUS,
  CollabNotification,
  ChatMessage
} from '../types';
import { STARTER_TEMPLATES } from './templates';

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
  NOTIFICATIONS: 'studypulse_collab_notifications',
  CHAT_MESSAGES: 'studypulse_chat_messages',
  REGISTERED_USERS: 'studypulse_registered_users',
  TELEMETRY_EVENTS: 'deepwork_telemetry_events',
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
  id: '',
  name: '',
  email: '',
  googleConnected: false,
  googleCalendarSyncEnabled: false,
  syncKey: ''
};

export function getSimpleStarterSubjects(): Subject[] {
  return [];
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
  return [];
}

export function generateUniqueBoardInviteCode(existingCodes?: string[]): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const taken = new Set((existingCodes || []).map(c => (c || '').toUpperCase().trim()));
  let code = '';
  do {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `DW-${result}`;
  } while (taken.has(code));
  return code;
}

export function generateBoardInviteCode(existingCodes?: string[] | string): string {
  if (Array.isArray(existingCodes)) {
    return generateUniqueBoardInviteCode(existingCodes);
  }
  return generateUniqueBoardInviteCode();
}

export function getDefaultBoards(): StudyBoard[] {
  const uniqueCode = generateUniqueBoardInviteCode();
  const uniqueBoardId = 'board_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  return [
    {
      id: uniqueBoardId,
      name: 'Main Board',
      description: 'Personal task and project management',
      color: '#0C66E4',
      icon: '⚡',
      isDefault: true,
      inviteCode: uniqueCode,
      members: [],
      createdAt: new Date().toISOString(),
    }
  ];
}

let hasInitializedInMemory = false;

export const StorageService = {
  /**
   * Initializes and safely migrates legacy data without any data loss.
   */
  ensureInitialized() {
    if (hasInitializedInMemory) return;
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
        // Keep initial UI blank with no forced tags
        this.saveTags([]);
      } else {
        // Repair tags if contaminated with nulls
        try {
          const parsed = JSON.parse(rawTags);
          if (Array.isArray(parsed)) {
            const sanitized = parsed
              .filter((t): t is Tag => Boolean(t && typeof t === 'object' && t.id))
              .map(t => ({
                id: t.id,
                name: t.name || 'tag',
                color: t.color || '#0C66E4',
                icon: t.icon || '🏷️',
                createdAt: t.createdAt || new Date().toISOString()
              }));
            if (sanitized.length !== parsed.length) {
              this.saveTags(sanitized.length > 0 ? sanitized : getDefaultTags());
            }
          }
        } catch {
          // ignore
        }
      }

      // Ensure topics have tags populated from subjectId if missing
      const rawTopics = localStorage.getItem(STORAGE_KEYS.TOPICS);
      if (rawTopics) {
        try {
          const parsedTopics = JSON.parse(rawTopics);
          if (Array.isArray(parsedTopics)) {
            let updated = false;
            const validTopics = parsedTopics.filter((t): t is Task => Boolean(t && typeof t === 'object' && t.id));
            if (validTopics.length !== parsedTopics.length) updated = true;
            const migratedTopics = validTopics.map((t: any) => {
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

      // Ensure default boards, sanitize unique invite codes, and clean any null members
      const rawBoards = localStorage.getItem(STORAGE_KEYS.BOARDS);
      if (!rawBoards) {
        const defBoards = getDefaultBoards();
        this.saveBoards(defBoards);
        this.saveActiveBoardId(defBoards[0].id);
      } else {
        try {
          const parsedBoards = JSON.parse(rawBoards);
          if (Array.isArray(parsedBoards)) {
            let boardsModified = false;
            const seenCodes = new Set<string>();
            const sanitized = parsedBoards
              .filter((b): b is StudyBoard => Boolean(b && typeof b === 'object' && b.id))
              .map(b => {
                let code = (b.inviteCode || '').trim().toUpperCase();
                // Migrate any legacy generic, missing or duplicate invite codes to unique codes
                if (!code || code === 'DW-MAIN' || code === 'DW-DEFAULT' || code === 'DW-STUDY' || seenCodes.has(code)) {
                  code = generateUniqueBoardInviteCode(Array.from(seenCodes));
                  boardsModified = true;
                }
                seenCodes.add(code);
                return {
                  ...b,
                  inviteCode: code,
                  color: b.color || '#0C66E4',
                  members: Array.isArray(b.members)
                    ? b.members.filter(Boolean).map(m => ({
                        id: m?.id || 'member_' + Math.random().toString(36).substring(2, 6),
                        name: m?.name || 'Member',
                        email: m?.email || '',
                        color: m?.color || '#0C66E4',
                        role: m?.role || 'editor'
                      }))
                    : []
                };
              });
            if (boardsModified || sanitized.length !== parsedBoards.length) {
              this.saveBoards(sanitized.length > 0 ? sanitized : getDefaultBoards());
            }
          }
        } catch {
          // ignore
        }
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
      hasInitializedInMemory = true;
    } catch (e) {
      console.warn('StorageService.ensureInitialized warning:', e);
      hasInitializedInMemory = true;
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
        if (Array.isArray(parsed)) {
          return parsed
            .filter((t): t is Tag => Boolean(t && typeof t === 'object' && t.id))
            .map(t => ({
              ...t,
              color: t.color || '#0C66E4',
              icon: t.icon || '🏷️'
            }));
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  saveTags(tags: Tag[]) {
    const clean = Array.isArray(tags)
      ? tags.filter((t): t is Tag => Boolean(t && typeof t === 'object' && t.id))
      : [];
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(clean));
  },

  addTag(name: string, color?: string, icon = '🏷️'): Tag {
    const cleanName = name.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-');
    if (!cleanName) {
      return { id: 'tag_default', name: 'general', color: '#0C66E4', icon: '🏷️', createdAt: new Date().toISOString() };
    }
    const tags = this.getTags();
    const existing = tags.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;

    const palette = ['#0C66E4', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];
    const chosenColor = color || palette[tags.length % palette.length];

    const newTag: Tag = {
      id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      color: chosenColor,
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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((s): s is Subject => Boolean(s && typeof s === 'object' && s.id))
            .map(s => ({
              ...s,
              color: s.color || '#0d9488'
            }));
        }
      }
      // Fallback: derive from tags
      return this.getTags().map(t => ({
        id: t?.id || 'tag_default',
        name: t?.name || 'Tag',
        color: t?.color || '#0C66E4',
        icon: t?.icon || '🏷️',
        createdAt: t?.createdAt || new Date().toISOString()
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
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((t): t is Task => Boolean(t && typeof t === 'object' && t.id));
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
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((s): s is StudySession => Boolean(s && typeof s === 'object' && s.id));
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
      const parsed = JSON.parse(raw);
      // Migrate to DeepworkUser v2 schema
      const upgraded: UserProfile = {
        ...DEFAULT_PROFILE,
        ...parsed,
        schemaVersion: 2,
        role: parsed.role || 'user',
        authProvider: parsed.authProvider || (parsed.googleConnected ? 'google' : (parsed.email ? 'email' : 'guest')),
        emailVerified: Boolean(parsed.googleConnected || parsed.email),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        createdAt: parsed.createdAt || new Date().toISOString()
      };
      return upgraded;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: UserProfile) {
    const upgraded: UserProfile = {
      ...profile,
      schemaVersion: 2,
      role: profile.role || 'user',
      authProvider: profile.authProvider || (profile.googleConnected ? 'google' : (profile.email ? 'email' : 'guest')),
      emailVerified: Boolean(profile.googleConnected || profile.email),
      updatedAt: new Date().toISOString(),
      createdAt: profile.createdAt || new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(upgraded));
    this.registerUser(upgraded);
    if (upgraded && upgraded.email) {
      this.reconcileBoardOwner(upgraded);
    }
  },

  signOut(): void {
    try {
      localStorage.removeItem('dstudy_has_authenticated');
      localStorage.removeItem(STORAGE_KEYS.SYNC_ROOM);
      localStorage.removeItem('studypulse_sync_key');
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);

      const guestProfile: UserProfile = {
        id: 'usr_guest_' + Date.now(),
        name: 'Guest Scholar',
        email: '',
        googleConnected: false,
        googleCalendarSyncEnabled: false,
        syncKey: '',
        schemaVersion: 2,
        role: 'user',
        authProvider: 'guest',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(guestProfile));

      // Reset boards to a fresh isolated board
      const freshBoards = getDefaultBoards();
      this.saveBoards(freshBoards);
      this.saveActiveBoardId(freshBoards[0].id);
    } catch (e) {
      console.warn('Sign out failed:', e);
    }
  },

  reconcileBoardOwner(profile: UserProfile) {
    if (!profile || !profile.email) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOARDS);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const updatedBoards = parsed.map((b: any) => {
        if (!b || typeof b !== 'object') return b;
        const members = Array.isArray(b.members) ? [...b.members] : [];
        const ownerIdx = members.findIndex(m => m.role === 'owner' || m.email === 'you@dstudy.app' || m.id === 'member_me');
        if (ownerIdx >= 0) {
          members[ownerIdx] = {
            ...members[ownerIdx],
            name: `${profile.name || 'You'} (Owner)`,
            email: profile.email,
            role: 'owner'
          };
        } else {
          members.unshift({
            id: profile.id || 'owner_1',
            name: `${profile.name || 'You'} (Owner)`,
            email: profile.email,
            color: '#0C66E4',
            role: 'owner'
          });
        }
        return { ...b, members };
      });
      localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(updatedBoards));
    } catch {
      // ignore
    }
  },

  /* ── Registered Users Directory ────────────────────────────── */
  getRegisteredUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      let users: UserProfile[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(users)) users = [];

      // Cleanse any dummy accounts previously seeded in localStorage
      const dummyEmails = ['sarah@deepwork.app', 'marcus@deepwork.app', 'priya@deepwork.app', 'alex@deepwork.app'];
      users = users.filter(u => u && u.email && !dummyEmails.includes(u.email.toLowerCase()));

      // Ensure current user is in list if email exists
      const current = this.getProfile();
      if (current && current.email && !users.some(u => u.email.toLowerCase() === current.email.toLowerCase())) {
        users.push(current);
      }

      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
      return users;
    } catch {
      return [];
    }
  },

  registerUser(profile: UserProfile): void {
    if (!profile || !profile.email) return;
    try {
      const users = this.getRegisteredUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === profile.email.toLowerCase());
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...profile };
      } else {
        users.push(profile);
      }
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
      this.logTelemetryEvent('signup', { email: profile.email, name: profile.name });
    } catch (e) {
      console.warn('Could not register user:', e);
    }
  },

  findUserByEmail(email: string): UserProfile | undefined {
    if (!email) return undefined;
    let normalized = email.trim().toLowerCase();
    if (normalized.endsWith('@gamil.com')) {
      normalized = normalized.replace('@gamil.com', '@gmail.com');
    }
    const users = this.getRegisteredUsers();
    return users.find(u => u.email.trim().toLowerCase() === normalized);
  },

  /**
   * Fetches all registered users from MongoDB Atlas and synchronizes local directory
   */
  async syncRegisteredUsersFromCloud(): Promise<UserProfile[]> {
    try {
      const res = await fetch('/api/sync?users=1');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          const currentList = this.getRegisteredUsers();
          const map = new Map<string, UserProfile>();
          currentList.forEach(u => {
            if (u && u.email) map.set(u.email.toLowerCase(), u);
          });
          data.users.forEach((u: any) => {
            if (u && u.email) {
              const existing = map.get(u.email.toLowerCase());
              map.set(u.email.toLowerCase(), {
                id: u.id || existing?.id || 'usr_' + Math.random().toString(36).substring(2, 6),
                name: u.name || existing?.name || u.email.split('@')[0],
                email: u.email,
                avatar: u.avatar || existing?.avatar || '',
                avatarUrl: u.avatar || existing?.avatarUrl || '',
                googleConnected: Boolean(u.googleConnected ?? existing?.googleConnected),
                googleCalendarSyncEnabled: true,
                syncKey: ''
              });
            }
          });
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(merged));
          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to sync registered users from cloud:', e);
    }
    return this.getRegisteredUsers();
  },

  /**
   * Performs an instant remote lookup on MongoDB Atlas for a user email
   */
  async lookupUserRemote(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    let normalized = email.trim().toLowerCase();
    if (normalized.endsWith('@gamil.com')) {
      normalized = normalized.replace('@gamil.com', '@gmail.com');
    }

    const local = this.findUserByEmail(normalized);
    if (local) return local;

    try {
      const res = await fetch(`/api/sync?lookupEmail=${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.user) {
          const user: UserProfile = {
            id: data.user.id || 'usr_' + Date.now(),
            name: data.user.name || normalized.split('@')[0],
            email: data.user.email || normalized,
            avatar: data.user.avatar || '',
            avatarUrl: data.user.avatar || '',
            googleConnected: true,
            googleCalendarSyncEnabled: true,
            syncKey: ''
          };
          this.registerUser(user);
          return user;
        }
      }
    } catch (e) {
      console.warn('Remote user lookup failed:', e);
    }
    return null;
  },

  /* ── Real Telemetry Event Logging ─────────────────────────── */
  logTelemetryEvent(event: string, metadata: Record<string, any> = {}) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TELEMETRY_EVENTS);
      const events = raw ? JSON.parse(raw) : [];
      const profile = this.getProfile();
      const newEvt = {
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: profile.id || 'usr_local',
        userName: profile.name || 'Anonymous User',
        userEmail: profile.email || 'guest@deepwork.local',
        avatar: profile.avatar || '',
        event,
        eventLabel: metadata.label || event,
        category: metadata.category || 'engagement',
        timestamp: new Date().toISOString(),
        country: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local',
        device: navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Win') ? 'Windows' : 'Mobile/Linux',
        metadata
      };
      const updated = [newEvt, ...events.slice(0, 200)];
      localStorage.setItem(STORAGE_KEYS.TELEMETRY_EVENTS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  /* ── Boards Operations ─────────────────────────────────────── */
  getBoards(): StudyBoard[] {
    this.ensureInitialized();
    const raw = localStorage.getItem(STORAGE_KEYS.BOARDS);
    const profile = this.getProfile();
    try {
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let boardsModified = false;
          const seenCodes = new Set<string>();
          const sanitizedBoards = parsed
            .filter((b): b is StudyBoard => Boolean(b && typeof b === 'object' && b.id))
            .map(b => {
              const members = Array.isArray(b.members)
                ? b.members.filter(Boolean).map(m => {
                    const isOwnerOrDStudy = m?.role === 'owner' || m?.email === 'you@dstudy.app' || m?.id === 'member_me';
                    if (isOwnerOrDStudy && profile.email) {
                      return {
                        id: profile.id || m?.id || 'owner_1',
                        name: `${profile.name || 'You'} (Owner)`,
                        email: profile.email,
                        color: m?.color || '#0C66E4',
                        role: 'owner' as const
                      };
                    }
                    return {
                      id: m?.id || 'member_' + Math.random().toString(36).substring(2, 6),
                      name: m?.name || 'Member',
                      email: m?.email === 'you@dstudy.app' ? (profile.email || '') : (m?.email || ''),
                      color: m?.color || '#0C66E4',
                      role: m?.role || 'editor'
                    };
                  })
                : [];

              if (profile.email && !members.some(m => m.email.toLowerCase() === profile.email.toLowerCase())) {
                members.unshift({
                  id: profile.id || 'owner_1',
                  name: `${profile.name || 'You'} (Owner)`,
                  email: profile.email,
                  color: '#0C66E4',
                  role: 'owner'
                });
              }

              let code = (b.inviteCode || '').trim().toUpperCase();
              if (!code || code === 'DW-MAIN' || code === 'DW-DEFAULT' || code === 'DW-STUDY' || seenCodes.has(code)) {
                code = generateUniqueBoardInviteCode(Array.from(seenCodes));
                boardsModified = true;
              }
              seenCodes.add(code);

              return {
                ...b,
                color: b.color || '#0C66E4',
                inviteCode: code,
                members
              };
            });
          if (boardsModified) {
            this.saveBoards(sanitizedBoards);
          }
          if (sanitizedBoards.length > 0) return sanitizedBoards;
        }
      }
      const def = getDefaultBoards();
      if (profile.email && def[0]) {
        def[0].members = [
          {
            id: profile.id || 'owner_1',
            name: `${profile.name || 'You'} (Owner)`,
            email: profile.email,
            color: '#0C66E4',
            role: 'owner'
          }
        ];
      }
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

  resetToCleanSlate(userProfile?: UserProfile) {
    this.saveTags([]);
    this.saveTopics([]);
    this.saveSessions([]);
    this.saveSubjects([]);
    this.saveNotifications([]);
    this.saveChatMessages([]);
    this.resetStreak(false);

    const freshBoard: StudyBoard = {
      id: 'board_main',
      name: 'Main Board',
      description: 'Personal task and project management',
      color: '#0C66E4',
      icon: '⚡',
      isDefault: true,
      members: userProfile?.email ? [
        {
          id: userProfile.id || 'owner_1',
          name: userProfile.name || 'You',
          email: userProfile.email,
          color: '#0C66E4',
          role: 'owner'
        }
      ] : [],
      createdAt: new Date().toISOString()
    };
    this.saveBoards([freshBoard]);
    this.saveActiveBoardId('board_main');
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
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const clean = parsed
        .filter((el): el is WhiteboardElement => Boolean(el && typeof el === 'object' && el.id))
        .map(el => ({
          ...el,
          color: el.color || '#0C66E4',
          strokeWidth: typeof el.strokeWidth === 'number' ? el.strokeWidth : 3
        }));
      if (clean.length !== parsed.length) {
        this.saveWhiteboardElements(boardId, clean);
      }
      return clean;
    } catch {
      return [];
    }
  },

  saveWhiteboardElements(boardId = 'default', elements: WhiteboardElement[]) {
    const clean = Array.isArray(elements)
      ? elements.filter((el): el is WhiteboardElement => Boolean(el && typeof el === 'object' && el.id))
      : [];
    localStorage.setItem(`${STORAGE_KEYS.WHITEBOARD}_${boardId}`, JSON.stringify(clean));
  },

  /* ── Starter Templates ─────────────────────────────────────── */
  applyStarterTemplate(templateId: string, targetBoardId?: string): { createdTags: Tag[]; createdTasks: Task[] } {
    const template = STARTER_TEMPLATES.find(t => t.id === templateId);
    if (!template) return { createdTags: [], createdTasks: [] };

    const createdTags: Tag[] = [];
    const tagMap = new Map<string, string>();

    template.tags.forEach(t => {
      const tag = this.addTag(t.name, t.color, t.icon);
      createdTags.push(tag);
      tagMap.set(t.name.toLowerCase(), tag.id);
    });

    const activeBoardId = targetBoardId || this.getActiveBoardId();
    const existingTopics = this.getTopics();
    const createdTasks: Task[] = [];
    const today = new Date().toISOString().split('T')[0];

    template.tasks.forEach((item, idx) => {
      const tagMatches = item.name.match(/#([a-zA-Z0-9_\-]+)/g) || [];
      const matchedTagIds: string[] = [];
      tagMatches.forEach(m => {
        const clean = m.slice(1).toLowerCase();
        const tid = tagMap.get(clean) || this.getTags().find(t => t.name.toLowerCase() === clean)?.id;
        if (tid && !matchedTagIds.includes(tid)) matchedTagIds.push(tid);
      });

      const primaryTagId = matchedTagIds[0] || createdTags[0]?.id || 'tag_default';

      const newTask: Task = {
        id: 'top_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 6),
        boardId: activeBoardId,
        subjectId: primaryTagId,
        tags: matchedTagIds.length > 0 ? matchedTagIds : [primaryTagId],
        name: item.name,
        category: item.category || 'concept',
        approxHours: item.approxHours || 1.5,
        scheduledDate: today,
        scheduledTime: idx % 2 === 0 ? '10:00' : '14:00',
        status: item.status || 'todo',
        notes: item.notes || '',
        completedHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      createdTasks.push(newTask);
    });

    this.saveTopics([...existingTopics, ...createdTasks]);
    return { createdTags, createdTasks };
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

      if (jsonData.tags && Array.isArray(jsonData.tags)) {
        this.saveTags(jsonData.tags.filter((t: any) => t && typeof t === 'object' && t.id).map((t: any) => ({
          ...t,
          color: t.color || '#0C66E4',
          icon: t.icon || '🏷️'
        })));
      }
      if (jsonData.boards && Array.isArray(jsonData.boards)) {
        this.saveBoards(jsonData.boards.filter((b: any) => b && typeof b === 'object' && b.id).map((b: any) => ({
          ...b,
          color: b.color || '#0C66E4',
          members: Array.isArray(b.members) ? b.members.filter(Boolean).map((m: any) => ({
            id: m?.id || 'member_' + Math.random().toString(36).substring(2, 6),
            name: m?.name || 'Member',
            email: m?.email || '',
            color: m?.color || '#0C66E4',
            role: m?.role || 'editor'
          })) : []
        })));
      }
      if (jsonData.tasks && Array.isArray(jsonData.tasks)) {
        this.saveTopics(jsonData.tasks.filter((t: any) => t && typeof t === 'object' && t.id));
      }
      if (jsonData.topics && !jsonData.tasks && Array.isArray(jsonData.topics)) {
        this.saveTopics(jsonData.topics.filter((t: any) => t && typeof t === 'object' && t.id));
      }
      if (jsonData.sessions && Array.isArray(jsonData.sessions)) {
        this.saveSessions(jsonData.sessions.filter((s: any) => s && typeof s === 'object' && s.id));
      }
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
  },

  // ── Collaboration Notifications ──────────────────────────────
  getNotifications(): CollabNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
    return [];
  },

  saveNotifications(notifications: CollabNotification[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  },

  addNotification(notif: Omit<CollabNotification, 'id' | 'timestamp' | 'read'>): CollabNotification {
    const current = this.getProfile();
    const currentEmail = (current.email || '').trim().toLowerCase();
    const recipientEmail = (notif.recipientEmail || '').trim().toLowerCase();

    const created: CollabNotification = {
      ...notif,
      id: (notif as any).id || 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      read: false
    };

    // Only append to local list if meant for current user or general system notification
    if (!recipientEmail || recipientEmail === currentEmail) {
      const list = this.getNotifications();
      const updated = [created, ...list];
      this.saveNotifications(updated);
    }

    return created;
  },

  markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    this.saveNotifications(updated);
  },

  markAllNotificationsAsRead(): void {
    const list = this.getNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    this.saveNotifications(updated);
  },

  respondToNotification(id: string, action: 'accept' | 'decline'): void {
    const list = this.getNotifications();
    const target = list.find(n => n.id === id);
    if (!target) return;
    const updated = list.map(n => {
      if (n.id === id) {
        return {
          ...n,
          read: true,
          status: action === 'accept' ? ('accepted' as const) : ('declined' as const)
        };
      }
      return n;
    });
    this.saveNotifications(updated);

    // If accepting a board invite, ensure board exists or add user to it
    if (action === 'accept' && target.boardId) {
      const boards = this.getBoards();
      const existing = boards.find(b => b.id === target.boardId);
      if (!existing && target.boardName) {
        const newBoard: StudyBoard = {
          id: target.boardId,
          name: target.boardName,
          description: 'Collaborative project board',
          color: '#8B5CF6',
          icon: '🚀',
          members: [
            { id: 'm_' + Math.random().toString(36).substring(2, 6), name: target.senderName, email: '', color: target.senderColor || '#EC4899', role: 'owner' }
          ],
          createdAt: new Date().toISOString()
        };
        this.saveBoards([...boards, newBoard]);
      }
    }
  },

  clearNotification(id: string): void {
    const list = this.getNotifications();
    this.saveNotifications(list.filter(n => n.id !== id));
  },

  // ── Secure Collaboration Chat ─────────────────────────────────
  getChatMessages(boardId?: string): ChatMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      const all: ChatMessage[] = raw ? JSON.parse(raw) : [];
      if (!boardId) return all;
      return all.filter(m => m.boardId === boardId);
    } catch (e) {
      console.error('Failed to load chat messages:', e);
      return [];
    }
  },

  saveChatMessages(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat messages:', e);
    }
  },

  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    const all: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const newMsg: ChatMessage = {
      ...msg,
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString()
    };
    all.push(newMsg);
    this.saveChatMessages(all);
    return newMsg;
  }
};
