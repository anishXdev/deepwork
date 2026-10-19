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
  BoardMember,
  Tag,
  UserGamification,
  CollabNotification,
  ChatMessage,
  CollabCallParticipant,
  CallType,
  ActiveCallState,
  IncomingCall,
  OutgoingCallState
} from '../types';
import { StorageService, DEFAULT_SETTINGS, DEFAULT_PROFILE, getSimpleStarterSubjects, getGateStarterSubjects, generateBoardInviteCode, generateUniqueBoardInviteCode } from '../services/storage';
import { AnalyticsService } from '../services/analytics';
import { GoogleCalendarService } from '../services/googleCalendar';
import { GoogleAuthService } from '../services/googleAuth';
import { CloudSyncService } from '../services/cloudSync';
import { sound } from '../services/audio';
import { Notifications } from '../services/notifications';
import { Haptics } from '../utils/haptics';
import { RealtimeCollab } from '../services/realtimeCall';
import { RingtoneService } from '../services/ringtone';

interface AppContextType {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  settings: UserSettings;
  profile: UserProfile;
  streaks: StreakData;
  tags: Tag[];
  addTag: (name: string, color?: string, icon?: string) => Tag;
  deleteTag: (id: string) => void;
  userGamification: UserGamification;
  addXp: (amount: number, reason?: string) => void;
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<boolean>;
  activeTab: 'study' | 'subjects' | 'tags' | 'timer' | 'analytics' | 'whiteboard' | 'sync';
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
  isTemplatesModalOpen: boolean;
  setIsTemplatesModalOpen: (open: boolean) => void;
  isMcpModalOpen: boolean;
  setIsMcpModalOpen: (open: boolean) => void;
  loadStarterTemplate: (templateId: string) => void;

  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  setStreaks: React.Dispatch<React.SetStateAction<StreakData>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setBoards: React.Dispatch<React.SetStateAction<StudyBoard[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<CollabNotification[]>>;
  resetWorkspaceToCleanSlate: (newProfile?: UserProfile) => void;

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
  joinBoardByCode: (code: string) => Promise<{ success: boolean; message: string; board?: StudyBoard }>;
  isJoinBoardModalOpen: boolean;
  setIsJoinBoardModalOpen: (open: boolean) => void;

  // Collaboration Notifications & Interactive Invites
  notifications: CollabNotification[];
  unreadNotificationsCount: number;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  respondToNotification: (id: string, action: 'accept' | 'decline') => void;
  clearNotification: (id: string) => void;
  sendCollabNotification: (notif: Omit<CollabNotification, 'id' | 'timestamp' | 'read'>) => CollabNotification;

  // Secure Collaboration Chat & Live Audio/Video Call
  isTeamRoomOpen: boolean;
  setIsTeamRoomOpen: (open: boolean) => void;
  activeCall: ActiveCallState | null;
  outgoingCall: OutgoingCallState | null;
  startCall: (type: CallType, selectedMemberIds?: string[]) => void;
  cancelOutgoingCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallVideo: () => void;
  toggleCallScreenShare: () => void;
  incomingCall: IncomingCall | null;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  simulateIncomingCall: (caller?: { name: string; avatar?: string; color: string }) => void;
  remoteMediaStream: MediaStream | null;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string, taskId?: string, taskTitle?: string) => void;

  // Actions
  setActiveTab: (tab: 'study' | 'subjects' | 'tags' | 'timer' | 'analytics' | 'whiteboard' | 'sync') => void;
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
  signOut: () => void;

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
  const [tags, setTags] = useState<Tag[]>(() => StorageService.getTags());
  const [userGamification, setUserGamification] = useState<UserGamification>(() => StorageService.getGamification());
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isJoinBoardModalOpen, setIsJoinBoardModalOpen] = useState(false);

  // Collaboration Notifications State
  const [notifications, setNotifications] = useState<CollabNotification[]>(() => StorageService.getNotifications());
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    StorageService.markNotificationAsRead(id);
    setNotifications(StorageService.getNotifications());
  };

  const markAllNotificationsAsRead = () => {
    StorageService.markAllNotificationsAsRead();
    setNotifications(StorageService.getNotifications());
    Notifications.toast('info', 'All notifications marked as read.');
  };

  const respondToNotification = async (id: string, action: 'accept' | 'decline') => {
    const notif = notifications.find(n => n.id === id);
    StorageService.respondToNotification(id, action);
    setNotifications(StorageService.getNotifications());

    // Update in MongoDB Atlas
    CloudSyncService.updateRemoteNotification(id, action === 'accept' ? 'accepted' : 'declined', true);

    if (action === 'accept') {
      sound.playCompletionChime();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

      if (notif?.inviteCode) {
        await joinBoardByCode(notif.inviteCode);
      } else if (notif?.boardId) {
        setActiveBoardIdState(notif.boardId);
        StorageService.saveActiveBoardId(notif.boardId);
      }

      setBoards(StorageService.getBoards());
      Notifications.toast('success', `🎉 Invite accepted! You joined "${notif?.boardName || 'the board'}".`);
    } else {
      Notifications.toast('info', 'Invite declined.');
    }
  };

  const clearNotification = (id: string) => {
    StorageService.clearNotification(id);
    setNotifications(StorageService.getNotifications());
  };

  const sendCollabNotification = (notif: Omit<CollabNotification, 'id' | 'timestamp' | 'read'>): CollabNotification => {
    const myEmail = (profile.email || '').trim().toLowerCase();
    const recipientEmail = (notif.recipientEmail || '').trim().toLowerCase();

    const created = StorageService.addNotification(notif);

    // If sending to another user via email, dispatch to MongoDB Atlas so the recipient gets it!
    if (recipientEmail && recipientEmail !== myEmail) {
      CloudSyncService.sendRemoteNotification(created);
      Notifications.toast('success', `👥 Invite dispatched to ${recipientEmail}! They will see it in their Notification Center.`);
    } else {
      // Local self notification
      setNotifications(StorageService.getNotifications());
      Notifications.toast('info', `🔔 ${notif.title}: ${notif.message}`);
    }

    return created;
  };

  // Live remote notifications synchronization from MongoDB Atlas
  useEffect(() => {
    const userEmail = (profile.email || '').trim().toLowerCase();
    if (!userEmail) return;

    const pullRemoteNotifs = async () => {
      try {
        const remoteList = await CloudSyncService.fetchRemoteNotifications(userEmail);
        if (remoteList && remoteList.length > 0) {
          const localList = StorageService.getNotifications();
          const localIds = new Set(localList.map(n => n.id));
          let hasNew = false;
          const merged = [...localList];

          for (const rn of remoteList) {
            if (!localIds.has(rn.id)) {
              merged.unshift(rn);
              localIds.add(rn.id);
              hasNew = true;
            }
          }

          if (hasNew) {
            StorageService.saveNotifications(merged);
            setNotifications(merged);
            sound.playCompletionChime();
            Notifications.toast('info', `🔔 New collaboration invite received!`);
          }
        }
      } catch (err) {
        console.warn('Notification sync error:', err);
      }
    };

    pullRemoteNotifs();
    const interval = setInterval(pullRemoteNotifs, 15000);
    return () => clearInterval(interval);
  }, [profile.email]);

  const signOut = () => {
    Haptics.tap();
    StorageService.signOut();
    const guest = StorageService.getProfile();
    setProfile(guest);
    setBoards(StorageService.getBoards());
    setActiveBoardIdState(StorageService.getActiveBoardId());
    setNotifications([]);
    setIsAuthModalOpen(false);
    Notifications.toast('info', '👋 You have been signed out successfully.');
  };

  // Team Room & Audio/Video Call State with Realtime WebRTC & Sockets
  const [isTeamRoomOpen, setIsTeamRoomOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => StorageService.getChatMessages());
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);

  const outgoingCallRef = useRef<OutgoingCallState | null>(null);
  outgoingCallRef.current = outgoingCall;
  const activeCallRef = useRef<ActiveCallState | null>(null);
  activeCallRef.current = activeCall;

  // Initialize and maintain WebSocket connection
  useEffect(() => {
    if (profile.email) {
      RealtimeCollab.connect(
        profile.email,
        activeBoardId,
        profile.id || 'usr_me',
        profile.name || profile.email.split('@')[0]
      );
    }
  }, [profile.email, activeBoardId, profile.id, profile.name]);

  // Register Realtime Collab Callbacks
  useEffect(() => {
    RealtimeCollab.setCallbacks({
      onIncomingCall: (call) => {
        setIncomingCall(call);
        RingtoneService.playIncomingRing();
        sound.playNotificationPop();
      },
      onCallAccepted: ({ callId, peerId, peerName }) => {
        RingtoneService.stopOutgoingRing();
        RingtoneService.playCallConnectedTone();
        const callType = outgoingCallRef.current?.type || 'video';
        setOutgoingCall(null);
        setActiveCall({
          active: true,
          callId,
          type: callType,
          isMuted: false,
          isVideoOn: callType === 'video',
          isScreenSharing: false,
          durationSeconds: 0,
          participants: [
            {
              id: peerId,
              name: peerName,
              color: '#10B981',
              isMuted: false,
              isVideoOn: callType === 'video',
              isSpeaking: false
            }
          ],
          selectedMemberIds: [peerId]
        });
        setIsTeamRoomOpen(true);
        Notifications.toast('success', `🎉 ${peerName} accepted the call! Live meeting started.`);
      },
      onCallDeclined: ({ peerName }) => {
        RingtoneService.stopOutgoingRing();
        RingtoneService.playCallEndedTone();
        setOutgoingCall(null);
        Notifications.toast('info', `📞 ${peerName || 'Teammate'} declined the call.`);
      },
      onCallCancelled: () => {
        RingtoneService.stopIncomingRing();
        setIncomingCall(null);
        Notifications.toast('info', 'Call was cancelled by the caller.');
      },
      onCallEnded: () => {
        RingtoneService.stopAll();
        RingtoneService.playCallEndedTone();
        setActiveCall(null);
        setOutgoingCall(null);
        setIncomingCall(null);
        setRemoteMediaStream(null);
        Notifications.toast('info', 'Call ended.');
      },
      onRemoteStream: (stream) => {
        setRemoteMediaStream(stream);
      },
      onChatMessage: (msg) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        StorageService.addChatMessage(msg);
        sound.playNotificationPop();
      }
    });
  }, []);

  // Outgoing call ringing elapsed timer (timeout after 45s)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (outgoingCall && outgoingCall.status === 'ringing') {
      timer = setInterval(() => {
        setOutgoingCall(prev => {
          if (!prev) return null;
          const secs = prev.ringingSeconds + 1;
          if (secs > 45) {
            RingtoneService.stopOutgoingRing();
            RingtoneService.playCallEndedTone();
            RealtimeCollab.cancelRingingCall(prev.callId);
            Notifications.toast('warning', '⚠️ No response from teammate. Call timed out.');
            return null;
          }
          return { ...prev, ringingSeconds: secs };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [outgoingCall?.status]);

  // Active call duration counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeCall?.active) {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall?.active]);

  const startCall = async (type: CallType, selectedMemberIds?: string[]) => {
    Haptics.success();
    const currentBoard = boards.find(b => b.id === activeBoardId);
    const allMembers = currentBoard?.members || [];

    // Filter callable members (exclude self)
    const otherMembers = allMembers.filter(
      m => (m.email || '').toLowerCase() !== (profile.email || '').toLowerCase()
    );

    const targetMembers = selectedMemberIds && selectedMemberIds.length > 0
      ? otherMembers.filter(m => selectedMemberIds.includes(m.id))
      : otherMembers;

    if (targetMembers.length === 0) {
      Notifications.toast('warning', '⚠️ Please invite or select another collaborator to call.');
      return;
    }

    const targetEmails = targetMembers.map(m => m.email).filter(Boolean);
    const memberIds = targetMembers.map(m => m.id);

    // Setup local media stream (camera/mic)
    await RealtimeCollab.setupLocalMedia(type);

    const callId = RealtimeCollab.startRingingCall({
      callType: type,
      boardId: activeBoardId,
      boardName: currentBoard?.name || 'Deepwork Board',
      targetEmails,
      targetMemberIds: memberIds,
      callerColor: '#0C66E4',
      callerAvatar: profile.avatar || profile.avatarUrl
    });

    setOutgoingCall({
      callId,
      type,
      status: 'ringing',
      targetMemberIds: memberIds,
      targetNames: targetMembers.map(m => m.name),
      targetEmails,
      boardId: activeBoardId,
      boardName: currentBoard?.name || 'Deepwork Board',
      ringingSeconds: 0
    });

    RingtoneService.playOutgoingRing();
    setIsTeamRoomOpen(true);

    StorageService.logTelemetryEvent('call_started', {
      callType: type,
      participantCount: targetMembers.length,
      boardTitle: currentBoard?.name
    });

    Notifications.toast('info', `📞 Calling ${targetMembers.map(m => m.name).join(', ')}... Ringing...`);
  };

  const cancelOutgoingCall = () => {
    Haptics.tap();
    RingtoneService.stopOutgoingRing();
    RingtoneService.playCallEndedTone();
    if (outgoingCall) {
      RealtimeCollab.cancelRingingCall(outgoingCall.callId);
    }
    setOutgoingCall(null);
    Notifications.toast('info', 'Call cancelled.');
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    Haptics.success();
    RingtoneService.stopIncomingRing();
    RingtoneService.playCallConnectedTone();

    // Prepare local camera/mic stream
    await RealtimeCollab.setupLocalMedia(incomingCall.type);

    RealtimeCollab.acceptIncomingCall(incomingCall.id, incomingCall.boardId, incomingCall.callerEmail || '');

    setActiveCall({
      active: true,
      callId: incomingCall.id,
      type: incomingCall.type,
      isMuted: false,
      isVideoOn: incomingCall.type === 'video',
      isScreenSharing: false,
      durationSeconds: 0,
      participants: incomingCall.participants,
      selectedMemberIds: incomingCall.participants.map(p => p.id)
    });

    setIncomingCall(null);
    setIsTeamRoomOpen(true);
    Notifications.toast('success', `Connected to live call with ${incomingCall.callerName}!`);
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) return;
    Haptics.warning();
    RingtoneService.stopIncomingRing();
    RealtimeCollab.rejectIncomingCall(incomingCall.id, incomingCall.callerEmail || '');
    Notifications.toast('info', `Call from ${incomingCall.callerName} declined.`);
    setIncomingCall(null);
  };

  const simulateIncomingCall = (caller?: { name: string; avatar?: string; color: string }) => {
    const currentBoard = boards.find(b => b.id === activeBoardId);
    const callerName = caller?.name || 'Teammate';
    RingtoneService.playIncomingRing();
    setIncomingCall({
      id: 'call_' + Date.now(),
      boardId: activeBoardId,
      boardName: currentBoard?.name || 'Workspace',
      callerId: 'usr_collab',
      callerName,
      callerEmail: 'demo@deepwork.app',
      callerColor: caller?.color || '#0C66E4',
      callerAvatar: caller?.avatar || '',
      type: 'video',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      participants: [
        { id: 'usr_collab', name: callerName, color: caller?.color || '#0C66E4', isMuted: false, isVideoOn: true, isSpeaking: true }
      ]
    });
  };

  const endCall = () => {
    Haptics.tap();
    RingtoneService.stopAll();
    RingtoneService.playCallEndedTone();
    RealtimeCollab.endActiveCall(activeCall?.callId);
    setActiveCall(null);
    setOutgoingCall(null);
    setRemoteMediaStream(null);
    Notifications.toast('info', 'Call ended.');
  };

  const toggleCallMute = () => {
    Haptics.tap();
    setActiveCall(prev => {
      if (!prev) return null;
      const nextMuted = !prev.isMuted;
      RealtimeCollab.setMuted(nextMuted);
      return { ...prev, isMuted: nextMuted };
    });
  };

  const toggleCallVideo = () => {
    Haptics.tap();
    setActiveCall(prev => {
      if (!prev) return null;
      const nextVideo = !prev.isVideoOn;
      RealtimeCollab.setVideoEnabled(nextVideo);
      return { ...prev, isVideoOn: nextVideo };
    });
  };

  const toggleCallScreenShare = async () => {
    Haptics.tap();
    if (activeCall?.isScreenSharing) {
      RealtimeCollab.stopScreenShare();
      setActiveCall(prev => prev ? { ...prev, isScreenSharing: false } : null);
      Notifications.toast('info', 'Screen sharing stopped.');
    } else {
      const stream = await RealtimeCollab.startScreenShare();
      if (stream) {
        setActiveCall(prev => prev ? { ...prev, isScreenSharing: true } : null);
        Notifications.toast('success', '🖥️ Now sharing screen with call participants!');
        stream.getVideoTracks()[0].onended = () => {
          RealtimeCollab.stopScreenShare();
          setActiveCall(prev => prev ? { ...prev, isScreenSharing: false } : null);
          Notifications.toast('info', 'Screen sharing stopped.');
        };
      }
    }
  };

  const sendChatMessage = (content: string, taskId?: string, taskTitle?: string) => {
    if (!content.trim()) return;
    const newMsg = StorageService.addChatMessage({
      boardId: activeBoardId,
      senderId: profile.id || 'user_current',
      senderName: profile.name || profile.email.split('@')[0] || 'Deepwork Member',
      senderColor: '#0C66E4',
      content: content.trim(),
      taskId,
      taskTitle
    });
    setChatMessages(StorageService.getChatMessages());
    RealtimeCollab.broadcastChatMessage(newMsg);
    Haptics.tap();
  };

  const loadStarterTemplate = (templateId: string) => {
    const res = StorageService.applyStarterTemplate(templateId, activeBoardId);
    setTags(StorageService.getTags());
    setTopics(StorageService.getTopics());
    Notifications.toast('success', `✨ Template loaded! Added ${res.createdTags.length} tags and ${res.createdTasks.length} cards.`);
  };

  const [activeTab, setActiveTab] = useState<'study' | 'subjects' | 'tags' | 'timer' | 'analytics' | 'whiteboard' | 'sync'>('study');
  const [activeFocusTopic, setActiveFocusTopicState] = useState<Topic | null>(null);

  useEffect(() => {
    StorageService.saveTags(tags);
  }, [tags]);

  const addTag = (name: string, color = '#0C66E4', icon = '🏷️'): Tag => {
    const created = StorageService.addTag(name, color, icon);
    setTags(StorageService.getTags());
    Notifications.toast('success', `🏷️ Tag "#${created.name}" created!`);
    return created;
  };

  const deleteTag = (id: string) => {
    StorageService.deleteTag(id);
    setTags(StorageService.getTags());
    Notifications.toast('info', 'Tag deleted.');
  };

  const addXp = (amount: number, reason = '') => {
    const res = StorageService.addXp(amount);
    setUserGamification(res.data);
    if (res.leveledUp) {
      sound.playCompletionChime();
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      Notifications.toast('success', `🎉 LEVEL UP! You reached Level ${res.data.level}: ${res.data.levelTitle}!`);
    } else if (reason) {
      Notifications.toast('info', `⭐ +${amount} XP (${reason})`);
    }
  };

  const exportBackup = () => {
    const data = StorageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepwork-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Notifications.toast('success', '💾 Full backup exported successfully!');
  };

  const importBackup = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const success = StorageService.importData(parsed);
      if (success) {
        setTags(StorageService.getTags());
        setBoards(StorageService.getBoards());
        setTopics(StorageService.getTopics());
        setSessions(StorageService.getSessions());
        setSettings(StorageService.getSettings());
        setProfile(StorageService.getProfile());
        setStreaks(StorageService.getStreaks());
        setUserGamification(StorageService.getGamification());
        Notifications.toast('success', '✅ Backup restored cleanly without data loss!');
        return true;
      }
      return false;
    } catch (e) {
      Notifications.toast('warning', '❌ Failed to parse backup file.');
      return false;
    }
  };

  useEffect(() => {
    StorageService.saveBoards(boards);
  }, [boards]);

  // Reconcile board owner when user signs in with their real profile
  useEffect(() => {
    if (profile.email) {
      setBoards(prev => {
        let changed = false;
        const updated = prev.map(b => {
          const members = Array.isArray(b.members) ? [...b.members] : [];
          const ownerIdx = members.findIndex(m => m.role === 'owner' || m.email === 'you@dstudy.app' || m.id === 'member_me');
          if (ownerIdx >= 0) {
            if (members[ownerIdx].email !== profile.email || members[ownerIdx].name !== `${profile.name || 'You'} (Owner)`) {
              changed = true;
              members[ownerIdx] = {
                ...members[ownerIdx],
                name: `${profile.name || 'You'} (Owner)`,
                email: profile.email,
                role: 'owner'
              };
            }
          } else {
            changed = true;
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
        return changed ? updated : prev;
      });
    }
  }, [profile.email, profile.name]);

  // Handle direct invite link navigation (?joinBoard=... or ?joinCode=... or ?code=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const joinBoardId = params.get('joinBoard');
      const joinBoardName = params.get('boardName');
      const inviter = params.get('inviter');
      const joinCode = params.get('joinCode') || params.get('code');

      if (joinCode) {
        joinBoardByCode(joinCode);
        const url = new URL(window.location.href);
        url.searchParams.delete('joinCode');
        url.searchParams.delete('code');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
        return;
      }

      if (joinBoardId) {
        setBoards(prev => {
          const existing = prev.find(b => b.id === joinBoardId);
          if (existing) {
            if (profile.email && !existing.members.some(m => m.email.toLowerCase() === profile.email.toLowerCase())) {
              return prev.map(b => b.id === joinBoardId ? {
                ...b,
                members: [...b.members, {
                  id: profile.id || 'member_' + Date.now(),
                  name: profile.name || 'Collaborator',
                  email: profile.email,
                  color: '#10B981',
                  role: 'editor'
                }]
              } : b);
            }
            return prev;
          }
          const newBoard: StudyBoard = {
            id: joinBoardId,
            name: joinBoardName ? decodeURIComponent(joinBoardName) : 'Collaborative Board',
            description: `Shared workspace invited by ${inviter ? decodeURIComponent(inviter) : 'team member'}`,
            color: '#8B5CF6',
            icon: '🚀',
            inviteCode: generateBoardInviteCode(joinBoardId),
            members: [
              {
                id: profile.id || 'member_' + Date.now(),
                name: profile.name || 'Collaborator',
                email: profile.email || '',
                color: '#10B981',
                role: 'editor'
              }
            ],
            createdAt: new Date().toISOString()
          };
          return [...prev, newBoard];
        });

        setActiveBoardIdState(joinBoardId);
        StorageService.saveActiveBoardId(joinBoardId);
        sound.playCompletionChime();
        Notifications.toast('success', `🎉 Joined board "${joinBoardName ? decodeURIComponent(joinBoardName) : 'Shared Workspace'}"!`);

        const url = new URL(window.location.href);
        url.searchParams.delete('joinBoard');
        url.searchParams.delete('boardName');
        url.searchParams.delete('inviter');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      }
    } catch (e) {
      console.warn('Could not process join board URL param:', e);
    }
  }, [profile.email, profile.name]);

  const setActiveBoardId = (id: string) => {
    setActiveBoardIdState(id);
    StorageService.saveActiveBoardId(id);
  };

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const joinBoardByCode = async (code: string): Promise<{ success: boolean; message: string; board?: StudyBoard }> => {
    const rawCode = (code || '').trim().toUpperCase();
    if (!rawCode) {
      return { success: false, message: 'Please enter a valid invite code' };
    }

    // 1. Check local boards
    const local = boards.find(b =>
      b.inviteCode?.toUpperCase() === rawCode ||
      b.id.toUpperCase() === rawCode
    );

    if (local) {
      setActiveBoardIdState(local.id);
      StorageService.saveActiveBoardId(local.id);
      sound.playCompletionChime();
      Notifications.toast('success', `Switched to "${local.name}"!`);
      return { success: true, message: `Switched to "${local.name}"`, board: local };
    }

    // 2. Query & Join remote in MongoDB Atlas
    try {
      const userMember = {
        id: profile.id || 'member_' + Date.now(),
        name: profile.name || 'Collaborator',
        email: profile.email || '',
        color: '#10B981',
        role: 'editor' as const
      };

      const joinRes = await CloudSyncService.joinBoardRemote(rawCode, userMember);
      if (joinRes.success && joinRes.board) {
        const boardToAdd: StudyBoard = joinRes.board;
        setBoards(prev => {
          const exists = prev.some(b => b.id === boardToAdd.id);
          if (exists) {
            return prev.map(b => b.id === boardToAdd.id ? boardToAdd : b);
          }
          return [...prev, boardToAdd];
        });

        setActiveBoardIdState(boardToAdd.id);
        StorageService.saveActiveBoardId(boardToAdd.id);
        sound.playCompletionChime();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        Notifications.toast('success', `🎉 Joined "${boardToAdd.name}"!`);
        return { success: true, message: `Successfully joined "${boardToAdd.name}"`, board: boardToAdd };
      }

      // Fallback direct boardCode query
      const res = await fetch(`/api/sync?boardCode=${encodeURIComponent(rawCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.board) {
          const remoteBoard: StudyBoard = data.board;
          const members = Array.isArray(remoteBoard.members) ? [...remoteBoard.members] : [];
          if (profile.email && !members.some(m => m.email.toLowerCase() === profile.email.toLowerCase())) {
            members.push(userMember);
          }

          const boardToAdd: StudyBoard = {
            ...remoteBoard,
            inviteCode: remoteBoard.inviteCode || rawCode,
            members
          };

          setBoards(prev => {
            const exists = prev.some(b => b.id === boardToAdd.id);
            if (exists) {
              return prev.map(b => b.id === boardToAdd.id ? boardToAdd : b);
            }
            return [...prev, boardToAdd];
          });

          setActiveBoardIdState(boardToAdd.id);
          StorageService.saveActiveBoardId(boardToAdd.id);
          sound.playCompletionChime();
          Haptics.success();
          Notifications.toast('success', `🎉 Joined "${boardToAdd.name}"!`);
          CloudSyncService.pushToCloudImmediate();
          return { success: true, message: `Successfully joined "${boardToAdd.name}"`, board: boardToAdd };
        } else {
          return { success: false, message: data.message || `No board found with code "${rawCode}"` };
        }
      }
      return { success: false, message: 'Could not connect to cloud workspace' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error joining board' };
    }
  };

  const createBoard = (name: string, description = '', color = '#0C66E4', icon = '📋'): StudyBoard => {
    const id = 'board_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const existingCodes = boards.map(b => b.inviteCode).filter(Boolean) as string[];
    const uniqueCode = generateUniqueBoardInviteCode(existingCodes);
    const newBoard: StudyBoard = {
      id,
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      isDefault: false,
      inviteCode: uniqueCode,
      members: [
        { id: profile.id || 'member_me', name: `${profile.name || 'You'} (Owner)`, email: profile.email || '', color, role: 'owner' },
      ],
      createdAt: new Date().toISOString(),
    };
    setBoards(prev => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    Notifications.toast('success', `📋 Board "${newBoard.name}" created!`);
    CloudSyncService.pushToCloudImmediate();
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
    const targetTopic = topics.find(t => t.id === topicId);
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
      sendCollabNotification({
        type: 'task_delegated',
        title: 'Work Delegated',
        message: `Card "${targetTopic?.name || 'Task'}" delegated to ${member.name}`,
        senderName: profile.name || 'Deepwork Member',
        senderColor: '#0C66E4',
        taskId: topicId,
        taskTitle: targetTopic?.name
      });
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
      setTimerSelectedSubjectId(topic.subjectId || '');
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
        if (Array.isArray(res.data.tags)) {
          setTags(res.data.tags.filter((t: any) => t && typeof t === 'object' && t.id).map((t: any) => ({
            ...t,
            color: t.color || '#0C66E4',
            icon: t.icon || '🏷️'
          })));
        }
        if (Array.isArray(res.data.subjects)) {
          setSubjects(res.data.subjects.filter((s: any) => s && typeof s === 'object' && s.id).map((s: any) => ({
            ...s,
            color: s.color || '#0d9488'
          })));
        }
        if (Array.isArray(res.data.topics)) {
          setTopics(res.data.topics.filter((t: any) => t && typeof t === 'object' && t.id));
        }
        if (Array.isArray(res.data.sessions)) {
          setSessions(res.data.sessions.filter((s: any) => s && typeof s === 'object' && s.id));
        }
        if (Array.isArray(res.data.boards)) {
          setBoards(res.data.boards.filter((b: any) => b && typeof b === 'object' && b.id).map((b: any) => ({
            ...b,
            color: b.color || '#0C66E4',
            members: Array.isArray(b.members) ? b.members.filter(Boolean) : []
          })));
        }
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
          addXp(35, 'Task Conquered!');

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
    addXp(Math.max(15, Math.round(durationMinutes * 1.5)), 'Deep Focus Time');

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

  const resetWorkspaceToCleanSlate = (newProfile?: UserProfile) => {
    StorageService.resetToCleanSlate(newProfile);
    if (newProfile) {
      StorageService.saveProfile(newProfile);
      setProfile(newProfile);
    }
    setTags([]);
    setTopics([]);
    setSubjects([]);
    setSessions([]);
    setNotifications([]);
    setChatMessages([]);
    setStreaks(StorageService.getStreaks());
    const freshBoards = StorageService.getBoards();
    setBoards(freshBoards);
    setActiveBoardIdState('board_main');
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
        setTags,
        setBoards,
        setNotifications,
        resetWorkspaceToCleanSlate,
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
        // Tags & Gamification
        tags,
        addTag,
        deleteTag,
        userGamification,
        addXp,
        isShortcutsModalOpen,
        setIsShortcutsModalOpen,
        isTemplatesModalOpen,
        setIsTemplatesModalOpen,
        isMcpModalOpen,
        setIsMcpModalOpen,
        loadStarterTemplate,
        exportBackup,
        importBackup,
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
        joinBoardByCode,
        isJoinBoardModalOpen,
        setIsJoinBoardModalOpen,
        // Collaboration Notifications
        notifications,
        unreadNotificationsCount,
        isNotificationCenterOpen,
        setIsNotificationCenterOpen,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        respondToNotification,
        clearNotification,
        sendCollabNotification,
        // Team Room & Live Call
        isTeamRoomOpen,
        setIsTeamRoomOpen,
        activeCall,
        outgoingCall,
        startCall,
        cancelOutgoingCall,
        endCall,
        toggleCallMute,
        toggleCallVideo,
        toggleCallScreenShare,
        incomingCall,
        acceptIncomingCall,
        rejectIncomingCall,
        simulateIncomingCall,
        remoteMediaStream,
        chatMessages,
        sendChatMessage,
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
        toggleTheme,
        signOut
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
