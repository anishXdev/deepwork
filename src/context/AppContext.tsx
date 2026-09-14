import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Subject, Topic, StudySession, UserSettings, UserProfile, StreakData, TaskStatus } from '../types';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_PROFILE } from '../services/storage';
import { AnalyticsService } from '../services/analytics';
import { GoogleCalendarService } from '../services/googleCalendar';

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

  // Actions
  setActiveTab: (tab: 'study' | 'subjects' | 'timer' | 'analytics' | 'sync') => void;
  setActiveFocusTopic: (topic: Topic | null) => void;
  openAddTopicModal: (defaultDate?: string) => void;
  closeTopicModal: () => void;
  openRescheduleModal: (topic: Topic) => void;
  closeRescheduleModal: () => void;
  openCreateSubjectModal: () => void;
  closeCreateSubjectModal: () => void;
  setIsSyncModalOpen: (open: boolean) => void;

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
  const [activeFocusTopic, setActiveFocusTopic] = useState<Topic | null>(null);

  // Modals state
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicModalDefaultDate, setTopicModalDefaultDate] = useState<string | undefined>(undefined);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTargetTopic, setRescheduleTargetTopic] = useState<Topic | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);

  // Sync state changes with storage
  useEffect(() => {
    StorageService.saveSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    StorageService.saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    StorageService.saveSessions(sessions);
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
        setActiveTab,
        setActiveFocusTopic,
        openAddTopicModal,
        closeTopicModal,
        openRescheduleModal,
        closeRescheduleModal,
        openCreateSubjectModal,
        closeCreateSubjectModal,
        setIsSyncModalOpen,
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
