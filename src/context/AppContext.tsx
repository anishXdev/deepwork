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
  AmbientSoundType,
  GATE_STREAM_SYLLABUS,
  StudyBoard,
  BoardMember
} from '../types';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_PROFILE, getSimpleStarterSubjects, getGateStarterSubjects } from '../services/storage';
import { AnalyticsService } from '../services/analytics';
import { GoogleCalendarService } from '../services/googleCalendar';
import { GoogleAuthService } from '../services/googleAuth';
import { CloudSyncService } from '../services/cloudSync';
import { sound } from '../services/audio';
import { Notifications } from '../services/notifications';
import { Haptics } from '../utils/haptics';

interface AppContextType {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  settings: UserSettings;
  profile: UserProfile;
  streaks: StreakData;
  activeTab: 'study' | 'subjects' | 'timer' | 'analytics' | 'whiteboard' | 'sync';
  activeFocusTopic: Topic | null;
  rescheduleTargetTopic: Topic | null;
  isTopicModalOpen: boolean;
  topicModalDefaultDate?: string;
  isRescheduleModalOpen: boolean;
  isSyncModalOpen: boolean;
  isCreateSubjectModalOpen: boolean;
  isStreakModalOpen: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  tourStep: 1 | 2 | 3;
  setTourStep: (step: 1 | 2 | 3) => void;
  nextTourStep: () => void;
  completeTour: () => void;
  celebrationTask: { name: string; quote: string } | null;
  setCelebrationTask: (val: { name: string; quote: string } | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  setStreaks: React.Dispatch<React.SetStateAction<StreakData>>;

  // Strict Focus Mode (Distraction Lockdown)
  isStrictFocusActive: boolean;
  distractionCount: number;
  enableStrictFocus: () => void;
  disableStrictFocus: () => void;
  incrementDistractionCount: () => void;

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
  setCustomTimerMinutes: (minutes: number) => void;
  addFiveMinutes: () => void;
  manualCompleteAndLog: () => void;

  // Cloud Sync
  cloudSyncStatus: CloudSyncStatus;
  syncKey: string;
  lastSyncedAt: string | null;
  syncWithCloudNow: () => Promise<boolean>;
  updateSyncKey: (newKey: string) => Promise<void>;

  // Boards & Collaborators
  boards: StudyBoard[];
  activeBoardId: string;
  activeBoard: StudyBoard | undefined;
  setActiveBoardId: (id: string) => void;
  createBoard: (name: string, description?: string, color?: string, icon?: string) => StudyBoard;
  updateBoard: (id: string, updates: Partial<StudyBoard>) => void;
  deleteBoard: (id: string) => void;
  addBoardMember: (boardId: string, member: { name: string; email: string; role?: 'editor' | 'viewer' }) => void;
  removeBoardMember: (boardId: string, memberId: string) => void;
  delegateTopic: (topicId: string, member: BoardMember | null) => void;

  // Actions
  setActiveTab: (tab: 'study' | 'subjects' | 'timer' | 'analytics' | 'whiteboard' | 'sync') => void;
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

  addSubject: (name: string, color: string, weeklyTargetHours?: number, examWeightageMarks?: number, highYieldTopics?: string[]) => Subject;
  loadGateStreamSyllabus: (streamKey: string, replaceExisting?: boolean) => void;
  setStudyMode: (isGate: boolean, streamKey?: string) => void;
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
  const [boards, setBoards] = useState<StudyBoard[]>(() => StorageService.getBoards());
  const [activeBoardId, setActiveBoardIdState] = useState<string>(() => StorageService.getActiveBoardId());

  const [activeTab, setActiveTab] = useState<'study' | 'subjects' | 'timer' | 'analytics' | 'whiteboard' | 'sync'>('study');
  const [activeFocusTopic, setActiveFocusTopicState] = useState<Topic | null>(null);

  useEffect(() => {
    StorageService.saveBoards(boards);
  }, [boards]);

  const setActiveBoardId = (id: string) => {
    setActiveBoardIdState(id);
    StorageService.saveActiveBoardId(id);
  };

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const createBoard = (name: string, description = '', color = '#0C66E4', icon = '📋'): StudyBoard => {
    const newBoard: StudyBoard = {
      id: 'board_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      isDefault: false,
      members: [
        { id: 'member_me', name: 'You (Owner)', email: profile.email || 'you@dstudy.app', color, role: 'owner' },
      ],
      createdAt: new Date().toISOString(),
    };
    setBoards(prev => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    Notifications.toast('success', `📋 Board "${newBoard.name}" created!`);
    return newBoard;
  };

  const updateBoard = (id: string, updates: Partial<StudyBoard>) => {
    setBoards(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBoard = (id: string) => {
    if (boards.length <= 1) {
      Notifications.toast('warning', '⚠️ Cannot delete the only remaining board.');
      return;
    }
    const filtered = boards.filter(b => b.id !== id);
    setBoards(filtered);
    if (activeBoardId === id) {
      setActiveBoardId(filtered[0].id);
    }
    Notifications.toast('info', 'Board deleted.');
  };

  const addBoardMember = (boardId: string, member: { name: string; email: string; role?: 'editor' | 'viewer' }) => {
    const colors = ['#0C66E4', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newMember: BoardMember = {
      id: 'member_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: member.name.trim(),
      email: member.email.trim(),
      color: randomColor,
      role: member.role || 'editor',
    };
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;
      return { ...b, members: [...(b.members || []), newMember] };
    }));
    Notifications.toast('success', `👥 Collaborator "${newMember.name}" invited to board!`);
  };

  const removeBoardMember = (boardId: string, memberId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== boardId) return b;
      return { ...b, members: (b.members || []).filter(m => m.id !== memberId) };
    }));
  };

  const delegateTopic = (topicId: string, member: BoardMember | null) => {
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        assigneeId: member ? member.id : undefined,
        assigneeName: member ? member.name : undefined,
        assigneeColor: member ? member.color : undefined,
        updatedAt: new Date().toISOString()
      };
    }));
    if (member) {
      Notifications.toast('info', `👤 Delegated task to ${member.name}`);
    } else {
      Notifications.toast('info', 'Task unassigned.');
    }
  };

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

  const setCustomTimerMinutes = (minutes: number) => {
    targetEndTimeRef.current = null;
    sessionStorage.removeItem('studypulse_timer_target');
    setIsTimerRunning(false);
    setTimerMode('work');
    setSettings(prev => ({ ...prev, pomodoroWorkMinutes: minutes }));
    const dur = minutes * 60;
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

    if (isStrictFocusActive) {
      setIsStrictFocusActive(false);
    }

    if (timerMode === 'work') {
      const completedMins = Math.max(1, Math.round(getModeDuration('work') / 60));
      const topicName = topics.find(t => t.id === timerSelectedTopicId)?.name;
      Notifications.notifyFocusComplete(topicName, completedMins);

      logStudySession(
        timerSelectedSubjectId || (subjects[0]?.id || ''),
        timerSelectedTopicId || undefined,
        completedMins,
        'pomodoro'
      );
      setStudiedSecondsInSession(0);
      switchTimerMode('break');
    } else {
      Notifications.notifyBreakComplete();
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
      document.title = 'dstudy — Minimalist Focus & Deep Flow';
      return;
    }

    const updateTitle = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      document.title = `(${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}) 🌊 dstudy`;
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    // Auto popup on website load if user has not yet authenticated
    const hasAuth = localStorage.getItem('dstudy_has_authenticated');
    return !hasAuth;
  });
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState<1 | 2 | 3>(1);
  const [celebrationTask, setCelebrationTask] = useState<{ name: string; quote: string } | null>(null);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const nextTourStep = () => {
    if (tourStep === 1) {
      setTourStep(2);
      setActiveTab('timer');
    } else if (tourStep === 2) {
      setTourStep(3);
      setActiveTab('analytics');
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    localStorage.setItem('dstudy_interactive_tour_completed', 'true');
    setIsTourOpen(false);
    setTourStep(1);
    setActiveTab('study');
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Strict Focus Mode state
  const [isStrictFocusActive, setIsStrictFocusActive] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);

  const enableStrictFocus = () => {
    setIsStrictFocusActive(true);
    setDistractionCount(0);
    startTimer();
  };

  const disableStrictFocus = () => {
    setIsStrictFocusActive(false);
  };

  const incrementDistractionCount = () => {
    setDistractionCount(prev => prev + 1);
  };

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

  // Sync default starter subjects with isGatePrep mode when user has 0 topics
  useEffect(() => {
    if (topics.length === 0) {
      const isCurrentlyGateStarter = subjects.length > 0 && subjects.every(s => s.id.startsWith('sub_gate_'));
      const isCurrentlySimpleStarter =
        subjects.length === 3 &&
        subjects[0]?.id === 'sub_1' &&
        subjects[1]?.id === 'sub_2' &&
        subjects[2]?.id === 'sub_3';

      if (settings.isGatePrep && isCurrentlySimpleStarter) {
        setSubjects(getGateStarterSubjects(settings.gateTargetStream || 'CSE'));
      } else if (!settings.isGatePrep && isCurrentlyGateStarter) {
        setSubjects(getSimpleStarterSubjects());
      }
    }
  }, [settings.isGatePrep]);

  const setStudyMode = (isGate: boolean, streamKey = 'CSE') => {
    setSettings(prev => ({
      ...prev,
      isGatePrep: isGate,
      gateTargetStream: isGate ? streamKey : prev.gateTargetStream,
      gateExamDate: isGate && !prev.gateExamDate ? '2027-02-06' : prev.gateExamDate,
      weeklyHoursTarget: isGate ? 28 : 20
    }));

    if (topics.length === 0) {
      setSubjects(isGate ? getGateStarterSubjects(streamKey) : getSimpleStarterSubjects());
    } else if (isGate) {
      loadGateStreamSyllabus(streamKey, false);
    }

    Notifications.toast(
      'info',
      isGate
        ? `🎓 Switched to GATE ${streamKey} Preparation Mode!`
        : '📚 Switched to Standard Simple Study Mode!'
    );
  };

  const addSubject = (
    name: string,
    color: string,
    weeklyTargetHours = 5,
    examWeightageMarks?: number,
    highYieldTopics?: string[]
  ): Subject => {
    const newSubject: Subject = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      color,
      weeklyTargetHours,
      examWeightageMarks,
      highYieldTopics,
      createdAt: new Date().toISOString()
    };
    setSubjects(prev => [...prev, newSubject]);
    return newSubject;
  };

  const loadGateStreamSyllabus = (streamKey: string, replaceExisting = false) => {
    const stream = GATE_STREAM_SYLLABUS[streamKey];
    if (!stream) return;

    setSettings(prev => ({ ...prev, isGatePrep: true, gateTargetStream: streamKey }));

    setSubjects(prev => {
      const base = replaceExisting ? [] : [...prev];
      const existingNames = new Set(base.map(s => s.name.toLowerCase()));
      const newSubjects: Subject[] = [];

      stream.subjects.forEach((preset, idx) => {
        if (!existingNames.has(preset.name.toLowerCase())) {
          newSubjects.push({
            id: `sub_gate_${streamKey.toLowerCase()}_${Date.now()}_${idx}`,
            name: preset.name,
            color: preset.color,
            weeklyTargetHours: preset.weeklyTargetHours,
            examWeightageMarks: preset.examWeightageMarks,
            highYieldTopics: preset.highYieldTopics,
            createdAt: new Date().toISOString()
          });
        }
      });

      const merged = [...base, ...newSubjects];
      Notifications.toast(
        'success',
        `🎯 Loaded ${stream.label} syllabus (${merged.length} subjects ready)!`
      );
      return merged;
    });
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
      boardId: topicData.boardId || activeBoardId,
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

    // If in interactive tour step 1, advance to step 2
    if (isTourOpen && tourStep === 1) {
      setTimeout(() => {
        setTourStep(2);
        setActiveTab('timer');
      }, 700);
    }

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
          // Multi-stage confetti celebration
          confetti({
            particleCount: 85,
            spread: 75,
            origin: { y: 0.65 },
            colors: ['#0d9488', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
          });
          setTimeout(() => {
            confetti({
              particleCount: 45,
              angle: 60,
              spread: 55,
              origin: { x: 0.1, y: 0.7 }
            });
            confetti({
              particleCount: 45,
              angle: 120,
              spread: 55,
              origin: { x: 0.9, y: 0.7 }
            });
          }, 180);

          sound.playCompletionChime();
          Haptics.success();

          const quotes = [
            "Outstanding focus! Every conquered task strengthens your momentum.",
            "Brilliant discipline! You showed up, focused, and delivered today.",
            "Goal crushed! Mastery is built one completed topic at a time.",
            "Victory in the books! Your streak and determination are unstoppable.",
            "Superb dedication! Consistency is your ultimate superpower."
          ];
          const chosenQuote = quotes[Math.floor(Math.random() * quotes.length)];
          setCelebrationTask({ name: t.name, quote: chosenQuote });
          Notifications.toast('success', `🎉 "${t.name}" completed! ${chosenQuote}`, 4000);
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
        isAuthModalOpen,
        setIsAuthModalOpen,
        isTourOpen,
        setIsTourOpen,
        tourStep,
        setTourStep,
        nextTourStep,
        completeTour,
        celebrationTask,
        setCelebrationTask,
        openAuthModal,
        closeAuthModal,
        setSubjects,
        setProfile,
        setTopics,
        setSessions,
        setStreaks,
        // Strict Focus Mode
        isStrictFocusActive,
        distractionCount,
        enableStrictFocus,
        disableStrictFocus,
        incrementDistractionCount,
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
        setCustomTimerMinutes,
        addFiveMinutes,
        manualCompleteAndLog,
        // Boards & Collaborators
        boards,
        activeBoardId,
        activeBoard,
        setActiveBoardId,
        createBoard,
        updateBoard,
        deleteBoard,
        addBoardMember,
        removeBoardMember,
        delegateTopic,
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
        loadGateStreamSyllabus,
        setStudyMode,
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
