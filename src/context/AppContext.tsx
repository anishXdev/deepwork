import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
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
import { E2EE } from '../services/e2ee';
import { parseSecureBoardJoinCode } from '../utils/boardInvite';

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
  topicBeingEdited: Topic | null;
  topicModalDefaultDate?: string;
  isRescheduleModalOpen: boolean;
  isSyncModalOpen: boolean;
  isCreateSubjectModalOpen: boolean;
  isStreakModalOpen: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  celebrationTask: { name: string; quote: string } | null;
  setCelebrationTask: (val: { name: string; quote: string } | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isTemplatesModalOpen: boolean;
  setIsTemplatesModalOpen: (open: boolean) => void;
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
  onlineMemberEmails: string[];
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
  remoteMediaStreams: Record<string, MediaStream>;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string, taskId?: string, taskTitle?: string) => void;

  // Actions
  setActiveTab: (tab: 'study' | 'subjects' | 'tags' | 'timer' | 'analytics' | 'whiteboard' | 'sync') => void;
  setActiveFocusTopic: (topic: Topic | null) => void;
  openAddTopicModal: (defaultDate?: string) => void;
  openEditTopicModal: (topic: Topic) => void;
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
  const [boards, setBoards] = useState<StudyBoard[]>(() => {
    const current = StorageService.getBoards();
    const secured = current.map(board => board.encryptionKey ? board : { ...board, encryptionKey: E2EE.createKey() });
    if (secured.some((board, i) => board.encryptionKey !== current[i]?.encryptionKey)) StorageService.saveBoards(secured);
    return secured;
  });
  const [activeBoardId, setActiveBoardIdState] = useState<string>(() => StorageService.getActiveBoardId());
  const [tags, setTags] = useState<Tag[]>(() => StorageService.getTags());
  const [userGamification, setUserGamification] = useState<UserGamification>(() => StorageService.getGamification());
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

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
      const boardKey = boards.find(board => board.id === created.boardId)?.encryptionKey;
      if (boardKey) {
        const secretFields = { title: created.title, message: created.message, boardName: created.boardName, taskId: created.taskId, taskTitle: created.taskTitle, task: created.task };
        void E2EE.encrypt(secretFields, boardKey).then(sealed => CloudSyncService.sendRemoteNotification({
          ...created, title: 'Encrypted team update', message: '', boardName: undefined, taskId: undefined, taskTitle: undefined, task: undefined, sealed, e2ee: true
        }));
      }
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
        const encryptedList = await CloudSyncService.fetchRemoteNotifications(userEmail);
        const remoteList: any[] = [];
        for (const item of encryptedList) {
          try {
            const key = boards.find(board => board.id === item.boardId)?.encryptionKey;
            const clear = item.e2ee && item.sealed && key ? await E2EE.decrypt<any>(item.sealed, key) : item;
            remoteList.push({ ...item, ...clear, sealed: undefined, e2ee: undefined });
          } catch (error) { console.warn('Could not decrypt a team notification.', error); }
        }
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
            if (rn.type === 'task_delegated' && rn.task?.id) {
              setTopics(prev => {
                if (prev.some(topic => topic.id === rn.task.id)) return prev;
                const next = [rn.task as Topic, ...prev];
                StorageService.saveTopics(next);
                return next;
              });
            }
          }

          if (hasNew) {
            StorageService.saveNotifications(merged);
            setNotifications(merged);
            sound.playCompletionChime();
            Notifications.toast('info', '🔔 New team update received.');
          }
        }
      } catch (err) {
        console.warn('Notification sync error:', err);
      }
    };

    pullRemoteNotifs();
    const interval = setInterval(pullRemoteNotifs, 15000);
    return () => clearInterval(interval);
  }, [profile.email, boards]);

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
  const knownChatMessageIds = useRef(new Set(StorageService.getChatMessages().map(message => message.id)));
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState | null>(null);
  const [remoteMediaStreams, setRemoteMediaStreams] = useState<Record<string, MediaStream>>({});
  const [onlineMemberEmails, setOnlineMemberEmails] = useState<string[]>([]);

  const outgoingCallRef = useRef<OutgoingCallState | null>(null);
  outgoingCallRef.current = outgoingCall;
  const activeCallRef = useRef<ActiveCallState | null>(null);
  activeCallRef.current = activeCall;

  // Persistent unique tab/window client identifier
  const tabClientId = useMemo(() => {
    let id = sessionStorage.getItem('deepwork_client_tab_id');
    if (!id) {
      id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('deepwork_client_tab_id', id);
    }
    return id;
  }, []);

  // Initialize and maintain WebSocket connection for all clients/tabs
  useEffect(() => {
    const effectiveEmail = (profile.email || '').trim().toLowerCase();
    const effectiveUserId = profile.id ? `${profile.id}_${tabClientId}` : tabClientId;
    const effectiveName = profile.name || (effectiveEmail ? effectiveEmail.split('@')[0] : 'Teammate');

    RealtimeCollab.connect(
      effectiveEmail || `${tabClientId}@deepwork.local`,
      activeBoardId,
      effectiveUserId,
      effectiveName
    );
  }, [profile.email, activeBoardId, profile.id, profile.name, tabClientId]);

  // Keep active board synced on the socket & load remote chat messages
  useEffect(() => {
    if (!activeBoardId) return;
    RealtimeCollab.updateBoard(activeBoardId);
    let stopped = false;
    const pullChat = async () => {
      const remoteMsgs = await CloudSyncService.fetchRemoteChat(activeBoardId);
      if (stopped || !remoteMsgs.length) return;
      const boardKey = boards.find(board => board.id === activeBoardId)?.encryptionKey;
      const clearMessages: ChatMessage[] = [];
      for (const message of remoteMsgs) {
        try {
          const clear = message.e2ee && boardKey ? await E2EE.decrypt<any>(message.content, boardKey) : message;
          clearMessages.push({ ...message, ...clear, e2ee: undefined });
        } catch (error) { console.warn('Could not decrypt board chat; check that you opened the secure invite link.', error); }
      }
      const newMessages = clearMessages.filter(message => !knownChatMessageIds.current.has(message.id));
      clearMessages.forEach(message => { knownChatMessageIds.current.add(message.id); StorageService.addChatMessage(message); });
      setChatMessages(StorageService.getChatMessages());
      newMessages.filter(message => message.senderId !== profile.id).forEach(message => {
        sound.playNotificationPop();
        Notifications.sendNotification(`💬 ${message.senderName}`, { body: message.content.slice(0, 120), tag: `deepwork-chat-${message.id}` });
      });
    };
    pullChat();
    const interval = setInterval(pullChat, 3000);
    return () => { stopped = true; clearInterval(interval); };
  }, [activeBoardId, profile.id, boards]);

  // Register Realtime Collab Callbacks
  useEffect(() => {
    RealtimeCollab.setCallbacks({
      onPresenceUpdate: emails => setOnlineMemberEmails(emails),
      onConnectionStatus: status => { if (status !== 'connected') setOnlineMemberEmails([]); },
      onIncomingCall: (call) => {
        setIncomingCall(call);
        RingtoneService.playIncomingRing();
        sound.playNotificationPop();
      },
      onCallAccepted: ({ callId, peerId, peerName, peerEmail }) => {
        RingtoneService.stopOutgoingRing();
        RingtoneService.playCallConnectedTone();
        const callType = outgoingCallRef.current?.type || 'video';
        setOutgoingCall(null);
        setActiveCall(prev => ({
          active: true, callId, type: callType, isMuted: prev?.isMuted || false,
          isVideoOn: prev?.isVideoOn ?? callType === 'video', isScreenSharing: prev?.isScreenSharing || false,
          durationSeconds: prev?.durationSeconds || 0,
          participants: [...(prev?.participants || []).filter(p => p.id !== peerId), {
            id: peerId, email: peerEmail, name: peerName, color: '#10B981', isMuted: false,
            isVideoOn: callType === 'video', isSpeaking: false
          }],
          selectedMemberIds: [...new Set([...(prev?.selectedMemberIds || []), peerId])]
        }));
        setIsTeamRoomOpen(true);
        Notifications.toast('success', `🎉 ${peerName} accepted the call! Live meeting started.`);
      },
      onParticipantJoined: ({ peerId, peerName, peerEmail }) => {
        setActiveCall(prev => prev ? ({
          ...prev,
          participants: prev.participants.some(participant => participant.id === peerId)
            ? prev.participants.map(participant => participant.id === peerId ? { ...participant, email: peerEmail, name: peerName } : participant)
            : [...prev.participants, { id: peerId, email: peerEmail, name: peerName, color: '#10B981', isMuted: false, isVideoOn: prev.type === 'video', isSpeaking: false }],
          selectedMemberIds: [...new Set([...prev.selectedMemberIds, peerId])]
        }) : prev);
      },
      onCallDeclined: ({ peerName }) => {
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
        setRemoteMediaStreams({});
        Notifications.toast('info', 'Call ended.');
      },
      onRemoteStream: (stream, peerEmail) => {
        setRemoteMediaStreams(prev => ({ ...prev, [peerEmail || `peer_${Object.keys(prev).length}`]: stream }));
      },
      onChatMessage: async (msg) => {
        if (knownChatMessageIds.current.has(msg.id)) return;
        try {
          const key = boards.find(board => board.id === msg.boardId)?.encryptionKey;
          const clear = (msg as any).e2ee && key ? await E2EE.decrypt<any>(msg.content, key) : msg;
          const decoded = { ...msg, ...clear, e2ee: undefined };
          if (knownChatMessageIds.current.has(decoded.id)) return;
          knownChatMessageIds.current.add(decoded.id);
          setChatMessages(prev => prev.some(m => m.id === decoded.id) ? prev : [...prev, decoded]);
          StorageService.addChatMessage(decoded);
          sound.playNotificationPop();
          Notifications.sendNotification(`💬 ${decoded.senderName}`, { body: decoded.content.slice(0, 120), tag: `deepwork-chat-${decoded.id}` });
        } catch (error) { console.warn('Could not decrypt realtime chat message.', error); }
      },
      onTaskDelegated: async (data: any) => {
        let payload = data;
        if (data?.sealed && data?.boardId) {
          const key = boards.find(board => board.id === data.boardId)?.encryptionKey;
          if (!key) return;
          try { payload = { ...data, ...(await E2EE.decrypt<any>(data.sealed, key)) }; } catch { return; }
        }
        const taskObj = payload?.task || payload;
        if (!taskObj || !taskObj.id) return;
        const recipientEmail = (payload?.recipientEmail || taskObj.assigneeEmail || '').trim().toLowerCase();
        const myEmail = (profile.email || '').trim().toLowerCase();
        if (recipientEmail && myEmail && recipientEmail !== myEmail) return;
        setTopics(prev => {
          const exists = prev.some(t => t.id === taskObj.id);
          const next = exists
            ? prev.map(t => t.id === taskObj.id ? { ...t, ...taskObj } : t)
            : [taskObj, ...prev];
          StorageService.saveTopics(next);
          return next;
        });
        sound.playNotificationPop();
        Notifications.toast('success', `📋 Work delegated directly to your board: "${taskObj.name || 'New Task'}"`);
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

    // Filter callable members (strictly exclude self)
    const myEmail = (profile.email || '').toLowerCase().trim();
    const myName = (profile.name || '').toLowerCase().trim();
    const otherMembers = allMembers.filter(m => {
      const memberEmail = (m.email || '').toLowerCase().trim();
      const memberName = (m.name || '').toLowerCase().trim();
      if (myEmail && memberEmail && memberEmail === myEmail) return false;
      if (profile.id && m.id === profile.id) return false;
      if (m.name.includes('(You)')) return false;
      if (myName && memberName && (memberName === myName || memberName === `${myName} (you)`)) return false;
      return true;
    });

    const targetMembers = (selectedMemberIds && selectedMemberIds.length > 0
      ? otherMembers.filter(m => selectedMemberIds.includes(m.id))
      : otherMembers);

    if (targetMembers.length === 0) {
      Notifications.toast('warning', '⚠️ Please invite another collaborator to call. You cannot call yourself.');
      return;
    }

    const validTargets = targetMembers.filter(member => {
      const email = (member.email || '').toLowerCase().trim();
      return email.includes('@') && (!myEmail || email !== myEmail);
    });
    if (!validTargets.length) {
      Notifications.toast('warning', 'Select at least one teammate with a valid email address.');
      return;
    }
    const targetEmails = validTargets.map(member => member.email.toLowerCase().trim());
    const memberIds = validTargets.map(member => member.id);

    try {
      const localStream = await RealtimeCollab.setupLocalMedia(type);
      if (!localStream) throw new Error('Allow microphone access to start a call.');
      const callId = await RealtimeCollab.startRingingCall({
        callType: type, boardId: activeBoardId, boardName: currentBoard?.name || 'Deepwork Board',
        targetEmails, targetMemberIds: memberIds,
        callerColor: '#0C66E4', callerAvatar: profile.avatarUrl || profile.avatar
      });

      setOutgoingCall({
        callId,
        type,
        status: 'ringing',
        targetMemberIds: memberIds,
        targetNames: validTargets.map(member => member.name),
        targetEmails,
        boardId: activeBoardId,
        boardName: currentBoard?.name || 'Deepwork Board',
        ringingSeconds: 0
      });

      RingtoneService.playOutgoingRing();
      setIsTeamRoomOpen(true);

      StorageService.logTelemetryEvent('call_started', {
        callType: type,
        participantCount: validTargets.length,
        boardTitle: currentBoard?.name
      });

      Notifications.toast('info', `📞 Calling ${validTargets.length} teammate${validTargets.length === 1 ? '' : 's'}...`);
    } catch (err: any) {
      RealtimeCollab.endActiveCall();
      console.warn('[AppContext] Error starting call:', err);
      Notifications.toast('warning', `⚠️ Call error: ${err.message || 'Unable to connect'}`);
    }
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

    const localStream = await RealtimeCollab.setupLocalMedia(incomingCall.type);
    if (!localStream) {
      Notifications.toast('warning', 'Allow microphone access to join the call.');
      return;
    }

    if (incomingCall.boardId && incomingCall.boardId !== activeBoardId) {
      setActiveBoardIdState(incomingCall.boardId);
      StorageService.saveActiveBoardId(incomingCall.boardId);
      RealtimeCollab.updateBoard(incomingCall.boardId);
    }

    try {
      await RealtimeCollab.acceptIncomingCall(incomingCall.id, incomingCall.boardId, incomingCall.callerEmail || '');
    } catch (err: any) {
      RealtimeCollab.endActiveCall(incomingCall.id);
      Notifications.toast('warning', err.message || 'Could not reach the signaling server.');
      return;
    }

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
    setRemoteMediaStreams({});
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
    knownChatMessageIds.current.add(newMsg.id);
    const boardKey = activeBoard?.encryptionKey;
    if (boardKey) {
      void E2EE.encrypt(newMsg, boardKey).then(content => {
        const wireMessage = { ...newMsg, content, taskId: undefined, taskTitle: undefined, e2ee: true };
        RealtimeCollab.broadcastChatMessage(wireMessage);
        CloudSyncService.sendRemoteChat(wireMessage);
      }).catch(error => console.error('Could not encrypt chat message:', error));
    } else {
      Notifications.toast('error', 'This board has no encryption key. Reopen a secure invite or create a new board.');
    }
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

  const hasMountedBoards = useRef(false);
  useEffect(() => {
    StorageService.saveBoards(boards);
    if (hasMountedBoards.current) CloudSyncService.scheduleDebouncedPush();
    else hasMountedBoards.current = true;
  }, [boards]);

  // Reconcile board owner when user signs in with their real profile
  useEffect(() => {
    if (profile.email) {
      setBoards(prev => {
        let changed = false;
        const updated = prev.map(b => {
          const members = Array.isArray(b.members) ? [...b.members] : [];
          const ownerIdx = members.findIndex(m => m.role === 'owner' || m.email === 'you@dstudy.app' || m.email === 'you@deepwork.app' || m.id === 'member_me');
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
        const inviteKey = new URLSearchParams(window.location.hash.slice(1)).get('key') || undefined;
        joinBoardByCode(joinCode, inviteKey);
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

  const joinBoardByCode = async (code: string, inviteKey?: string): Promise<{ success: boolean; message: string; board?: StudyBoard }> => {
    const parsedInvite = parseSecureBoardJoinCode(code);
    const rawCode = parsedInvite.inviteCode;
    inviteKey = inviteKey || parsedInvite.encryptionKey;
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
      if (joinRes.success && joinRes.encryptedEnvelope && inviteKey) {
        const shared = await E2EE.decrypt<{ board: StudyBoard; topics: Topic[] }>(joinRes.encryptedEnvelope, inviteKey);
        const joinedMembers = Array.isArray(joinRes.members) ? joinRes.members : [];
        const members = [...(shared.board.members || []), ...joinedMembers, userMember];
        const uniqueMembers = members.filter((member, index) => members.findIndex(other => other.id === member.id || (member.email && other.email?.toLowerCase() === member.email.toLowerCase())) === index);
        const boardToAdd: StudyBoard = { ...shared.board, encryptionKey: inviteKey, members: uniqueMembers };
        setTopics(prev => { const merged = [...prev.filter(t => t.boardId !== boardToAdd.id), ...shared.topics]; StorageService.saveTopics(merged); return merged; });
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

      if (joinRes.success && !inviteKey) return { success: false, message: 'This board is encrypted. Ask the owner for the complete secure join code.' };

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
      encryptionKey: E2EE.createKey(),
      members: [
        { id: profile.id || 'member_me', name: `${profile.name || 'You'} (Owner)`, email: profile.email || '', color, role: 'owner' },
      ],
      createdAt: new Date().toISOString(),
    };
    const nextBoards = [...boards, newBoard];
    // Persist before kicking off the asynchronous cloud push. This also protects
    // a newly-created board from the startup cloud pull racing with creation.
    StorageService.saveBoards(nextBoards);
    setBoards(nextBoards);
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
    let updatedTopic: any = null;
    setTopics(prev => {
      const next = prev.map(t => {
        if (t.id !== topicId) return t;
        updatedTopic = {
          ...t,
          assigneeId: member ? member.id : undefined,
          assigneeName: member ? member.name : undefined,
          assigneeEmail: member ? (member.email || '').toLowerCase() : undefined,
          assigneeColor: member ? member.color : undefined,
          delegatedBy: member ? (profile.name || profile.email) : undefined,
          delegatedAt: member ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        };
        return updatedTopic;
      });
      StorageService.saveTopics(next);
      return next;
    });

    if (member && updatedTopic) {
      const recipientEmail = (member.email || '').toLowerCase().trim();
      sendCollabNotification({
        type: 'task_delegated',
        title: 'Work Delegated',
        message: `Task "${updatedTopic.name || 'Task'}" was assigned directly to your board`,
        senderName: profile.name || profile.email || 'Deepwork Member',
        senderColor: '#0C66E4',
        boardId: activeBoardId,
        boardName: activeBoard?.name,
        recipientEmail,
        taskId: topicId,
        taskTitle: updatedTopic.name,
        task: updatedTopic
      });
      const boardKey = activeBoard?.encryptionKey;
      if (boardKey) void E2EE.encrypt({ task: updatedTopic }, boardKey).then(sealed => RealtimeCollab.sendTaskDelegation({ sealed, e2ee: true, boardId: activeBoardId, recipientEmail }));
      CloudSyncService.scheduleDebouncedPush(500);
      Notifications.toast('success', `👤 Delegated "${updatedTopic.name}" directly to ${member.name}'s board!`);
    } else {
      CloudSyncService.scheduleDebouncedPush(500);
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
      document.title = 'Deepwork — Minimalist Focus & Deep Flow';
      return;
    }

    const updateTitle = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      document.title = `(${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}) 🌊 Deepwork`;
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
  const [topicBeingEdited, setTopicBeingEdited] = useState<Topic | null>(null);
  const [topicModalDefaultDate, setTopicModalDefaultDate] = useState<string | undefined>(undefined);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleTargetTopic, setRescheduleTargetTopic] = useState<Topic | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    // Auto popup on website load if user has not yet authenticated
    const hasAuth = localStorage.getItem('deepwork_has_authenticated') || localStorage.getItem('dstudy_has_authenticated');
    return !hasAuth;
  });
  const [celebrationTask, setCelebrationTask] = useState<{ name: string; quote: string } | null>(null);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

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
        const cloudTasks = res.data.tasks || res.data.topics;
        if (Array.isArray(cloudTasks)) {
          const cleanTasks = cloudTasks.filter((t: any) => t && typeof t === 'object' && t.id);
          setTopics(cleanTasks);
          StorageService.saveTopics(cleanTasks);
        }
        if (Array.isArray(res.data.sessions)) {
          setSessions(res.data.sessions.filter((s: any) => s && typeof s === 'object' && s.id));
        }
        let migratedBoardKeys = false;
        if (Array.isArray(res.data.boards)) {
          const cloudBoards = res.data.boards.filter((b: any) => b && typeof b === 'object' && b.id).map((b: any) => {
            if (!b.encryptionKey) migratedBoardKeys = true;
            return { ...b, encryptionKey: b.encryptionKey || E2EE.createKey(), color: b.color || '#0C66E4', members: Array.isArray(b.members) ? b.members.filter(Boolean) : [] };
          });
          const localBoards = StorageService.getBoards();
          const mergedBoards = [...cloudBoards];
          for (const localBoard of localBoards) {
            if (!mergedBoards.some(board => board.id === localBoard.id)) mergedBoards.push(localBoard);
          }
          setBoards(mergedBoards);
          StorageService.saveBoards(mergedBoards);
          if (migratedBoardKeys) setTimeout(() => CloudSyncService.pushToCloudImmediate(), 1000);
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
    let trackingId = topicData.trackingId;
    if (!trackingId) {
      let isDuplicate = false;
      do {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);
        trackingId = `DW-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
        isDuplicate = topics.some(topic => topic.trackingId === trackingId);
      } while (isDuplicate);
    }

    const newTopic: Topic = {
      ...topicData,
      id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      trackingId,
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
    setTopicBeingEdited(null);
    setTopicModalDefaultDate(defaultDate || AnalyticsService.getTodayDateString());
    setIsTopicModalOpen(true);
  };

  const openEditTopicModal = (topic: Topic) => {
    setTopicBeingEdited(topic);
    setTopicModalDefaultDate(topic.scheduledDate || AnalyticsService.getTodayDateString());
    setIsTopicModalOpen(true);
  };

  const closeTopicModal = () => {
    setIsTopicModalOpen(false);
    setTopicBeingEdited(null);
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
    const initialBoardId = freshBoards[0]?.id || 'board_main';
    setActiveBoardIdState(initialBoardId);
    StorageService.saveActiveBoardId(initialBoardId);
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
        topicBeingEdited,
        topicModalDefaultDate,
        isRescheduleModalOpen,
        isSyncModalOpen,
        isCreateSubjectModalOpen,
        isStreakModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
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
        onlineMemberEmails,
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
        remoteMediaStreams,
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
        openEditTopicModal,
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
