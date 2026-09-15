import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Subject, 
  Topic, 
  StudySession, 
  UserSettings, 
  UserProfile, 
  StreakData, 
  TaskStatus, 
  CloudSyncStatus,
  TimerMode,
  AmbientSoundType
} from '../types';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_PROFILE } from '../services/storage';
import { AnalyticsService } from '../services/analytics';
import { GoogleCalendarService } from '../services/googleCalendar';
import { GoogleAuthService } from '../services/googleAuth';
import { CloudSyncService } from '../services/cloudSync';
import { sound } from '../services/audio';

interface AppContextType {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  settings: UserSettings;
  profile: UserProfile;
  streaks: StreakData;
  activeTab: 'study' | 'subjects' | 'timer' | 'analytics' | 'sync';
  activeFocusTopic: Topic | null;
  rescheduleTargetTopic: Topic | null;
  isTopicModalOpen: boolean;
  topicModalDefaultDate?: string;
  isRescheduleModalOpen: boolean;
  isSyncModalOpen: boolean;
  isCreateSubjectModalOpen: boolean;
  isStreakModalOpen: boolean;

  // Persistent Global Focus Timer
  timerMode: TimerMode;
  timeLeft: number;
  isTimerRunning: boolean;
  timerSelectedSubjectId: string;
  setTimerSelectedSubjectId: (id: string) => void;
  timerSelectedTopicId: string;
  setTimerSelectedTopicId: (id: string) => void;
  studiedSecondsInSession: number;
  ambientSoundType: AmbientSoundType;
  setAmbientSoundType: (type: AmbientSoundType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  switchTimerMode: (mode: TimerMode) => void;
  addFiveMinutes: () => void;
  manualCompleteAndLog: () => void;

  // Cloud Sync
  cloudSyncStatus: CloudSyncStatus;
  syncKey: string;
  lastSyncedAt: string | null;
  syncWithCloudNow: () => Promise<boolean>;
  updateSyncKey: (newKey: string) => Promise<void>;

  // Actions
  setActiveTab: (tab: 'study' | 'subjects' | 'timer' | 'analytics' | 'sync') => void;
  setActiveFocusTopic: (topic: Topic | null) => void;
  openAddTopicModal: (defaultDate?: string) => void;
  closeTopicModal: () => void;
  openRescheduleModal: (topic: Topic) => void;
  closeRescheduleModal: () => void;
  openCreateSubjectModal: () => void;
  closeCreateSubjectModal: () => void;
  openStreakModal: () => void;
  closeStreakModal: () => void;
  setIsSyncModalOpen: (open: boolean) => void;

  // Streak & Preset Data Controls
  resetStreak: (keepLongest?: boolean) => void;
  setManualStreak: (current: number, longest?: number) => void;
  clearAllPresetData: () => void;

  addSubject: (name: string, color: string, weeklyTargetHours?: number) => Subject;
  deleteSubject: (id: string) => void;
  addTopic: (topicData: Omit<Topic, 'id' | 'completedHours' | 'createdAt' | 'updatedAt'>) => Promise<Topic>;
  updateTopic: (id: string, updates: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  toggleTopicCompletion: (id: string) => void;
  rescheduleTopic: (id: string, date: string, time?: string) => Promise<void>;

  logStudySession: (
    subjectId: string,
    topicId: string | undefined,
    durationMinutes: number,
    mode: 'pomodoro' | 'short_break' | 'long_break' | 'custom'
  ) => void;

  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateProfile: (newProfile: Partial<UserProfile>) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>(() => StorageService.getSubjects());
  const [topics, setTopics] = useState<Topic[]>(() => StorageService.getTopics());
  const [sessions, setSessions] = useState<StudySession[]>(() => StorageService.getSessions());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());
  const [profile, setProfile] = useState<UserProfile>(() => StorageService.getProfile());
  const [streaks, setStreaks] = useState<StreakData>(() => StorageService.getStreaks());

  const [activeTab, setActiveTab] = useState<'study' | 'subjects' | 'timer' | 'analytics' | 'sync'>('study');
  const [activeFocusTopic, setActiveFocusTopicState] = useState<Topic | null>(null);

  // Persistent Global Focus Timer State & Delta Engine
  const [timerMode, setTimerMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const savedTime = sessionStorage.getItem('studypulse_timer_timeleft');
    return savedTime ? parseInt(savedTime, 10) : settings.pomodoroWorkMinutes * 60;
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSelectedSubjectId, setTimerSelectedSubjectId] = useState<string>(() => subjects[0]?.id || '');
  const [timerSelectedTopicId, setTimerSelectedTopicId] = useState<string>('');
  const [studiedSecondsInSession, setStudiedSecondsInSession] = useState<number>(0);
  const [ambientSoundType, setAmbientSoundType] = useState<AmbientSoundType>('none');
  const targetEndTimeRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());

  // Auto-select subject for timer if unselected
  useEffect(() => {
    if (!timerSelectedSubjectId && subjects.length > 0) {
      setTimerSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, timerSelectedSubjectId]);

  // Restore timer target from sessionStorage on reload
  useEffect(() => {
    const savedTarget = sessionStorage.getItem('studypulse_timer_target');
    if (savedTarget) {
      const target = parseInt(savedTarget, 10);
      const remaining = Math.ceil((target - Date.now()) / 1000);
      if (remaining > 0) {
        targetEndTimeRef.current = target;
        setTimeLeft(remaining);
        setIsTimerRunning(true);
      } else {
        sessionStorage.removeItem('studypulse_timer_target');
        sessionStorage.removeItem('studypulse_timer_timeleft');
      }
    }
  }, []);

  const setActiveFocusTopic = (topic: Topic | null) => {
    setActiveFocusTopicState(topic);
    if (topic) {
      setTimerSelectedSubjectId(topic.subjectId);
      setTimerSelectedTopicId(topic.id);
    }
  };

  const getModeDuration = (m: TimerMode) => {
    if (m === 'work') return settings.pomodoroWorkMinutes * 60;
    if (m === 'break') return settings.pomodoroBreakMinutes * 60;
    return settings.pomodoroLongBreakMinutes * 60;
  };

  const startTimer = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const currentRemaining = timeLeft <= 0 ? getModeDuration(timerMode) : timeLeft;
    const target = Date.now() + currentRemaining * 1000;
    targetEndTimeRef.current = target;
    lastTickTimeRef.current = Date.now();
    sessionStorage.setItem('studypulse_timer_target', target.toString());
    sessionStorage.setItem('studypulse_timer_timeleft', currentRemaining.toString());
    setTimeLeft(currentRemaining);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    if (targetEndTimeRef.current) {
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      sessionStorage.setItem('studypulse_timer_timeleft', remaining.toString());
    }
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
    const dur = getModeDuration(timerMode);
    setTimeLeft(dur);
    sessionStorage.setItem('studypulse_timer_timeleft', dur.toString());
  };

  const switchTimerMode = (newMode: TimerMode) => {
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
    setTimerMode(newMode);
    const dur = getModeDuration(newMode);
    setTimeLeft(dur);
    sessionStorage.setItem('studypulse_timer_timeleft', dur.toString());
  };

  const addFiveMinutes = () => {
    if (targetEndTimeRef.current) {
      targetEndTimeRef.current += 300 * 1000;
      sessionStorage.setItem('studypulse_timer_target', targetEndTimeRef.current.toString());
    }
    setTimeLeft(prev => {
      const next = prev + 300;
      sessionStorage.setItem('studypulse_timer_timeleft', next.toString());
      return next;
    });
  };

  const handleTimerComplete = () => {
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
    sound.playCompletionChime();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(timerMode === 'work' ? "Focus Session Complete! 🌊" : "Break Concluded! ⏰", {
          body: timerMode === 'work' 
            ? "Splendid flow session! Time for a refreshing break." 
            : "Break is over. Ready to dive back into focus?",
          icon: "/icon.svg"
        });
      } catch {}
    }

    if (timerMode === 'work') {
      const completedMins = Math.max(1, Math.round(getModeDuration('work') / 60));
      logStudySession(
        timerSelectedSubjectId || (subjects[0]?.id || ''),
        timerSelectedTopicId || undefined,
        completedMins,
        'pomodoro'
      );
      setStudiedSecondsInSession(0);
      switchTimerMode('break');
    } else {
      switchTimerMode('work');
    }
  };

  const manualCompleteAndLog = () => {
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
    if (studiedSecondsInSession >= 30) {
      const minutes = Math.round((studiedSecondsInSession / 60) * 10) / 10;
      logStudySession(
        timerSelectedSubjectId || (subjects[0]?.id || ''),
        timerSelectedTopicId || undefined,
        Math.max(1, Math.round(minutes)),
        'pomodoro'
      );
      sound.playCompletionChime();
    }
    setStudiedSecondsInSession(0);
    const dur = getModeDuration(timerMode);
    setTimeLeft(dur);
    sessionStorage.setItem('studypulse_timer_timeleft', dur.toString());
  };

  // Real-Time Delta Loop & Visibility/Focus Sync
  useEffect(() => {
    if (!isTimerRunning) {
      document.title = 'StudyPulse 🌊 Focus & Flow';
      return;
    }

    const updateTitle = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      document.title = `(${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}) 🌊 StudyPulse`;
    };

    updateTitle(timeLeft);

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
      sessionStorage.setItem('studypulse_timer_timeleft', remaining.toString());
      updateTitle(remaining);

      // Add elapsed study seconds
      const elapsed = Math.max(0, (now - lastTickTimeRef.current) / 1000);
      lastTickTimeRef.current = now;
      if (timerMode === 'work') {
        setStudiedSecondsInSession(prev => prev + elapsed);
      }

      if (now >= targetEndTimeRef.current) {
        clearInterval(interval);
        handleTimerComplete();
      }
    }, 250);

    // Immediate sync on tab switch or window focus
    const handleSyncOnFocus = () => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
      sessionStorage.setItem('studypulse_timer_timeleft', remaining.toString());
      updateTitle(remaining);
      if (now >= targetEndTimeRef.current) {
        handleTimerComplete();
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnFocus);
    window.addEventListener('focus', handleSyncOnFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
      window.removeEventListener('focus', handleSyncOnFocus);
    };
  }, [isTimerRunning, timerMode, timeLeft, timerSelectedSubjectId, timerSelectedTopicId]);

  // Ambient sound sync
  useEffect(() => {
    if (isTimerRunning && ambientSoundType !== 'none') {
      sound.startAmbientSound(ambientSoundType);
    } else {
      sound.stopAmbientSound();
    }
    return () => sound.stopAmbientSound();
  }, [isTimerRunning, ambientSoundType]);

  // Modals state
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicModalDefaultDate, setTopicModalDefaultDate] = useState<string | undefined>(undefined);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTargetTopic, setRescheduleTargetTopic] = useState<Topic | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // Cloud Sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [syncKey, setSyncKey] = useState<string>(() => CloudSyncService.getSyncKey());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => CloudSyncService.getLastSyncedAt());

  // Startup sync & backend config
  useEffect(() => {
    GoogleAuthService.fetchBackendConfig();

    // Auto pull latest cloud snapshot if available
    setCloudSyncStatus('syncing');
    CloudSyncService.pullFromCloud().then(res => {
      if (res.found && res.data) {
        if (res.data.subjects) setSubjects(res.data.subjects);
        if (res.data.topics) setTopics(res.data.topics);
        if (res.data.sessions) setSessions(res.data.sessions);
        if (res.data.streaks) setStreaks(res.data.streaks);
        if (res.data.settings) setSettings(res.data.settings);
        setCloudSyncStatus('synced');
        setLastSyncedAt(res.updatedAt || new Date().toISOString());
      } else {
        setCloudSyncStatus('idle');
      }
    }).catch(() => {
      setCloudSyncStatus('idle');
    });
  }, []);

  useEffect(() => {
    StorageService.saveSubjects(subjects);
    CloudSyncService.scheduleDebouncedPush();
  }, [subjects]);

  useEffect(() => {
    StorageService.saveTopics(topics);
    CloudSyncService.scheduleDebouncedPush();
  }, [topics]);

  useEffect(() => {
    StorageService.saveSessions(sessions);
    CloudSyncService.scheduleDebouncedPush();
  }, [sessions]);

  useEffect(() => {
    StorageService.saveSettings(settings);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [settings]);

  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  useEffect(() => {
    StorageService.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    StorageService.saveStreaks(streaks);
    CloudSyncService.scheduleDebouncedPush();
  }, [streaks]);

  const addSubject = (name: string, color: string, weeklyTargetHours = 5): Subject => {
    const newSubject: Subject = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      color,
      weeklyTargetHours,
      createdAt: new Date().toISOString()
    };
    setSubjects(prev => [...prev, newSubject]);
    return newSubject;
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    // Also remove associated topics
    setTopics(prev => prev.filter(t => t.subjectId !== id));
  };

  const addTopic = async (
    topicData: Omit<Topic, 'id' | 'completedHours' | 'createdAt' | 'updatedAt'>
  ): Promise<Topic> => {
    const newTopic: Topic = {
      ...topicData,
      id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      completedHours: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const targetSubject = subjects.find(s => s.id === newTopic.subjectId);

    // Auto-generate Google Calendar Link
    const webCalendarLink = GoogleCalendarService.generateWebCalendarLink(newTopic, targetSubject);
    newTopic.gcalLink = webCalendarLink;

    // Direct Google Calendar API sync if token exists
    if (profile.googleConnected && profile.googleAccessToken && profile.googleCalendarSyncEnabled) {
      try {
        const syncRes = await GoogleCalendarService.syncToGoogleCalendar(
          newTopic,
          targetSubject,
          profile.googleAccessToken
        );
        if (syncRes.eventId) {
          newTopic.gcalEventId = syncRes.eventId;
        }
        if (syncRes.htmlLink) {
          newTopic.gcalLink = syncRes.htmlLink;
        }
      } catch (err) {
        console.warn('Google Calendar API auto-sync failed, fallback to deep-link:', err);
      }
    }

    setTopics(prev => [newTopic, ...prev]);
    return newTopic;
  };

  const updateTopic = (id: string, updates: Partial<Topic>) => {
    setTopics(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  };

  const deleteTopic = (id: string) => {
    setTopics(prev => prev.filter(t => t.id !== id));
    if (activeFocusTopic?.id === id) {
      setActiveFocusTopic(null);
    }
  };

  const toggleTopicCompletion = (id: string) => {
    setTopics(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const newStatus: TaskStatus = t.status === 'completed' ? 'todo' : 'completed';
        if (newStatus === 'completed') {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.8 }
          });
        }
        return {
          ...t,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  const rescheduleTopic = async (id: string, date: string, time?: string) => {
    const existing = topics.find(t => t.id === id);
    if (!existing) return;

    const updated: Topic = {
      ...existing,
      scheduledDate: date,
      scheduledTime: time || existing.scheduledTime || '09:00',
      updatedAt: new Date().toISOString()
    };

    const targetSubject = subjects.find(s => s.id === updated.subjectId);
    updated.gcalLink = GoogleCalendarService.generateWebCalendarLink(updated, targetSubject);

    if (profile.googleConnected && profile.googleAccessToken && profile.googleCalendarSyncEnabled) {
      try {
        await GoogleCalendarService.syncToGoogleCalendar(
          updated,
          targetSubject,
          profile.googleAccessToken
        );
      } catch (e) {
        console.warn('Could not sync reschedule to Google Calendar API:', e);
      }
    }

    setTopics(prev => prev.map(t => (t.id === id ? updated : t)));
  };

  const logStudySession = (
    subjectId: string,
    topicId: string | undefined,
    durationMinutes: number,
    mode: 'pomodoro' | 'short_break' | 'long_break' | 'custom'
  ) => {
    if (durationMinutes <= 0) return;

    const now = new Date();
    const durationHours = Math.round((durationMinutes / 60) * 100) / 100;

    const newSession: StudySession = {
      id: 'sess_' + Date.now(),
      subjectId,
      topicId,
      startTime: new Date(now.getTime() - durationMinutes * 60000).toISOString(),
      endTime: now.toISOString(),
      durationMinutes,
      durationHours,
      mode,
      completed: true
    };

    // 1. Add session
    setSessions(prev => [newSession, ...prev]);

    // 2. Increment topic completed hours if associated
    if (topicId) {
      setTopics(prev =>
        prev.map(t => {
          if (t.id !== topicId) return t;
          const newHours = Math.round((t.completedHours + durationHours) * 10) / 10;
          const isDone = newHours >= t.approxHours;
          return {
            ...t,
            completedHours: newHours,
            status: isDone ? 'completed' : 'in_progress',
            updatedAt: new Date().toISOString()
          };
        })
      );
    }

    // 3. Update streak
    setStreaks(prev => AnalyticsService.updateStreakOnSession(prev, durationHours));

    // 4. Milestone celebration
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...newProfile }));
  };

  const openAddTopicModal = (defaultDate?: string) => {
    setTopicModalDefaultDate(defaultDate || AnalyticsService.getTodayDateString());
    setIsTopicModalOpen(true);
  };

  const closeTopicModal = () => {
    setIsTopicModalOpen(false);
    setTopicModalDefaultDate(undefined);
  };

  const openRescheduleModal = (topic: Topic) => {
    setRescheduleTargetTopic(topic);
    setIsRescheduleModalOpen(true);
  };

  const closeRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setRescheduleTargetTopic(null);
  };

  const openCreateSubjectModal = () => {
    setIsCreateSubjectModalOpen(true);
  };

  const closeCreateSubjectModal = () => {
    setIsCreateSubjectModalOpen(false);
  };

  const openStreakModal = () => {
    setIsStreakModalOpen(true);
  };

  const closeStreakModal = () => {
    setIsStreakModalOpen(false);
  };

  const resetStreak = (keepLongest = true) => {
    const updated = StorageService.resetStreak(keepLongest);
    setStreaks(updated);
    CloudSyncService.pushToCloudImmediate();
  };

  const setManualStreak = (current: number, longest?: number) => {
    const updated = StorageService.setManualStreak(current, longest);
    setStreaks(updated);
    CloudSyncService.pushToCloudImmediate();
  };

  const clearAllPresetData = () => {
    const blank = StorageService.clearSampleData();
    setSubjects([]);
    setTopics([]);
    setSessions([]);
    setStreaks(blank.streaks);
    CloudSyncService.pushToCloudImmediate();
  };

  const syncWithCloudNow = async (): Promise<boolean> => {
    setCloudSyncStatus('syncing');
    const res = await CloudSyncService.pushToCloudImmediate();
    if (res.success) {
      setCloudSyncStatus('synced');
      setLastSyncedAt(res.updatedAt || new Date().toISOString());
      return true;
    }
    setCloudSyncStatus('error');
    return false;
  };

  const updateSyncKey = async (newKey: string) => {
    CloudSyncService.setSyncKey(newKey);
    setSyncKey(newKey);
    setCloudSyncStatus('syncing');
    const pullRes = await CloudSyncService.pullFromCloud();
    if (pullRes.found && pullRes.data) {
      if (pullRes.data.subjects) setSubjects(pullRes.data.subjects);
      if (pullRes.data.topics) setTopics(pullRes.data.topics);
      if (pullRes.data.sessions) setSessions(pullRes.data.sessions);
      if (pullRes.data.streaks) setStreaks(pullRes.data.streaks);
      if (pullRes.data.settings) setSettings(pullRes.data.settings);
      setCloudSyncStatus('synced');
      setLastSyncedAt(pullRes.updatedAt || new Date().toISOString());
    } else {
      await CloudSyncService.pushToCloudImmediate();
      setCloudSyncStatus('synced');
    }
  };

  return (
    <AppContext.Provider
      value={{
        subjects,
        topics,
        sessions,
        settings,
        profile,
        streaks,
        activeTab,
        activeFocusTopic,
        rescheduleTargetTopic,
        isTopicModalOpen,
        topicModalDefaultDate,
        isRescheduleModalOpen,
        isSyncModalOpen,
        isCreateSubjectModalOpen,
        isStreakModalOpen,
        // Persistent Global Focus Timer
        timerMode,
        timeLeft,
        isTimerRunning,
        timerSelectedSubjectId,
        setTimerSelectedSubjectId,
        timerSelectedTopicId,
        setTimerSelectedTopicId,
        studiedSecondsInSession,
        ambientSoundType,
        setAmbientSoundType,
        startTimer,
        pauseTimer,
        resetTimer,
        switchTimerMode,
        addFiveMinutes,
        manualCompleteAndLog,
        // Cloud Sync
        cloudSyncStatus,
        syncKey,
        lastSyncedAt,
        syncWithCloudNow,
        updateSyncKey,
        setActiveTab,
        setActiveFocusTopic,
        openAddTopicModal,
        closeTopicModal,
        openRescheduleModal,
        closeRescheduleModal,
        openCreateSubjectModal,
        closeCreateSubjectModal,
        openStreakModal,
        closeStreakModal,
        setIsSyncModalOpen,
        resetStreak,
        setManualStreak,
        clearAllPresetData,
        addSubject,
        deleteSubject,
        addTopic,
        updateTopic,
        deleteTopic,
        toggleTopicCompletion,
        rescheduleTopic,
        logStudySession,
        updateSettings,
        updateProfile,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
