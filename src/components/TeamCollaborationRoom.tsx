import { RealtimeCollab } from '../services/realtimeCall';
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ScreenShare,
  Lock,
  Send,
  Users,
  X,
  Sparkles,
  ShieldCheck,
  Share2,
  PhoneCall,
  Radio,
  FileText,
  CheckSquare,
  Square,
  BellRing,
  Minus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';
import { BoardMember } from '../types';

export const TeamCollaborationRoom: React.FC = () => {
  const {
    activeBoard,
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
    simulateIncomingCall,
    remoteMediaStream,
    chatMessages,
    sendChatMessage,
    profile,
    topics
  } = useApp();

  const [activeTab, setActiveTab] = useState<'chat' | 'call'>('chat');
  const [windowMode, setWindowMode] = useState<'floating' | 'minimized' | 'full'>('floating');
  const [inputText, setInputText] = useState('');
  const [selectedTaskToShare, setSelectedTaskToShare] = useState<string>('');
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Filter chat messages strictly for the active board
  const boardMessages = chatMessages.filter(m => !m.boardId || m.boardId === activeBoard?.id);

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const members: BoardMember[] = activeBoard?.members && activeBoard.members.length > 0
    ? activeBoard.members
    : (profile.email ? [
        {
          id: profile.id || 'owner_1',
          name: `${profile.name || 'You'} (You)`,
          email: profile.email,
          color: '#0C66E4',
          role: 'owner' as const
        }
      ] : []);

  // Exclude current user from callable teammates
  const callableMembers = members.filter(m => m.email.toLowerCase() !== (profile.email || '').toLowerCase());
  const effectiveCallable = callableMembers;

  // Selected participants to call
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() =>
    effectiveCallable.map(m => m.id)
  );

  useEffect(() => {
    setSelectedMemberIds(effectiveCallable.map(m => m.id));
  }, [effectiveCallable.length]);

  // If a call or ring is started, auto-switch to call tab and ensure floating mode
  useEffect(() => {
    if (activeCall?.active || outgoingCall) {
      setActiveTab('call');
      setWindowMode(prev => prev === 'minimized' ? 'minimized' : 'floating');
    }
  }, [activeCall?.active, outgoingCall]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteMediaStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteMediaStream;
    }
  }, [remoteMediaStream]);

  // Sync local stream with local video element using singleton RealtimeCollab stream
  useEffect(() => {
    if (activeCall?.active && activeCall.isVideoOn && localVideoRef.current) {
      const s = RealtimeCollab.getLocalStream();
      if (s && localVideoRef.current.srcObject !== s) {
        localVideoRef.current.srcObject = s;
      }
    }
  }, [activeCall?.active, activeCall?.isVideoOn]);

  // Handle screen stream attachment to screen video element
  useEffect(() => {
    if (activeCall?.isScreenSharing && screenVideoRef.current) {
      const s = RealtimeCollab.getScreenStream();
      if (s && screenVideoRef.current.srcObject !== s) {
        screenVideoRef.current.srcObject = s;
      }
    }
  }, [activeCall?.isScreenSharing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [boardMessages]);

  const isVisible = isTeamRoomOpen || activeCall?.active || Boolean(outgoingCall);
  if (!isVisible) return null;

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedTaskToShare) return;

    let taskId: string | undefined;
    let taskTitle: string | undefined;

    if (selectedTaskToShare) {
      const task = topics.find(t => t.id === selectedTaskToShare);
      if (task) {
        taskId = task.id;
        taskTitle = task.name;
      }
    }

    sendChatMessage(inputText, taskId, taskTitle);
    setInputText('');
    setSelectedTaskToShare('');
    setIsTaskPickerOpen(false);
  };

  const handleToggleMember = (id: string) => {
    Haptics.tap();
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleToggleAllMembers = () => {
    Haptics.tap();
    if (selectedMemberIds.length === effectiveCallable.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(effectiveCallable.map(m => m.id));
    }
  };

  // Built-in Screen Sharing Handler
  const handleToggleScreenShare = async () => {
    Haptics.tap();
    await toggleCallScreenShare();
  };

  const handleEndCall = () => {
    endCall();
  };

  // Minimized floating capsule docked at bottom right
  if (windowMode === 'minimized') {
    return (
      <aside
        aria-label="Active Call Floating Bar"
        className="fixed bottom-5 right-5 z-40 h-14 rounded-full px-4 flex items-center gap-3 shadow-2xl border pointer-events-auto animate-in slide-in-from-bottom-2 duration-150"
        style={{
          background: 'var(--bg-card-alt)',
          borderColor: 'var(--border)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(16, 185, 129, 0.3)'
        }}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />

        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            {activeCall?.type === 'video' ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
            <span>
              {activeCall?.active
                ? formatCallTime(activeCall.durationSeconds)
                : outgoingCall
                ? `Ringing ${formatCallTime(outgoingCall.ringingSeconds)}`
                : 'Team Room'}
            </span>
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
            {activeCall?.participants[0]?.name || outgoingCall?.targetNames[0] || activeBoard?.name || 'Workspace'}
          </span>
        </div>

        {activeCall?.active && (
          <div className="flex items-center gap-1 border-l pl-2 border-slate-700">
            <button
              type="button"
              onClick={toggleCallMute}
              className={`p-2 rounded-full transition cursor-pointer ${
                activeCall.isMuted ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title={activeCall.isMuted ? 'Unmute' : 'Mute'}
            >
              {activeCall.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={toggleCallVideo}
              className={`p-2 rounded-full transition cursor-pointer ${
                !activeCall.isVideoOn ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title={activeCall.isVideoOn ? 'Camera Off' : 'Camera On'}
            >
              {activeCall.isVideoOn ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            Haptics.tap();
            setWindowMode('floating');
            setIsTeamRoomOpen(true);
          }}
          className="p-2 rounded-full hover:bg-white/10 text-blue-400 hover:text-blue-300 transition cursor-pointer"
          title="Restore Floating Call Window"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {activeCall?.active ? (
          <button
            type="button"
            onClick={handleEndCall}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        ) : outgoingCall ? (
          <button
            type="button"
            onClick={cancelOutgoingCall}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer"
            title="Cancel Call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsTeamRoomOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </aside>
    );
  }

  const windowInnerMarkup = (
    <>
      {/* Top Header */}
      <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-card-alt)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center border border-emerald-600/20 shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold truncate max-w-[130px] sm:max-w-xs" style={{ color: 'var(--text-primary)' }}>
                {activeBoard?.name || 'Main Board'}
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-0.5 shrink-0">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>E2EE</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">
              Secure peer-to-peer workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Tab switchers */}
          <div className="flex items-center rounded-lg p-0.5 border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <button
              type="button"
              onClick={() => {
                Haptics.tap();
                setActiveTab('chat');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                Haptics.tap();
                setActiveTab('call');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'call'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Call {(activeCall?.active || outgoingCall) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}</span>
            </button>
          </div>

          {/* Minimize button: collapses into bottom-right floating pill */}
          <button
            type="button"
            onClick={() => {
              Haptics.tap();
              setWindowMode('minimized');
            }}
            className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Minimize to floating pill"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen / Float toggle */}
          <button
            type="button"
            onClick={() => {
              Haptics.tap();
              setWindowMode(prev => prev === 'full' ? 'floating' : 'full');
            }}
            className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={windowMode === 'full' ? 'Exit fullscreen (Float)' : 'Fullscreen / Expand'}
          >
            {windowMode === 'full' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              Haptics.tap();
              if (activeCall?.active || outgoingCall) {
                setWindowMode('minimized');
                Notifications.toast('info', 'Call minimized to floating bar. Click expand to reopen.');
              } else {
                setIsTeamRoomOpen(false);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                {/* Chat Messages Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {boardMessages.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        End-to-End Encrypted Team Chat
                      </h4>
                      <p className="text-xs max-w-sm" style={{ color: 'var(--text-muted)' }}>
                        Messages are shared only with members of this board. Start the discussion or share a task card below!
                      </p>
                    </div>
                  ) : (
                    boardMessages.map(msg => {
                      const isMe = msg.senderId === (profile.id || 'user_current');
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-xs"
                            style={{ backgroundColor: msg.senderColor || '#0C66E4' }}
                          >
                            {msg.senderName.slice(0, 2).toUpperCase()}
                          </div>

                          <div className={`space-y-1 max-w-[80%] ${isMe ? 'items-end' : ''}`}>
                            <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isMe ? 'justify-end' : ''}`}>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{msg.senderName}</span>
                              <span>•</span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div
                              className="p-3 rounded-2xl text-xs leading-relaxed break-words shadow-xs"
                              style={{
                                background: isMe ? 'var(--accent)' : 'var(--bg-card-alt)',
                                color: isMe ? '#ffffff' : 'var(--text-primary)',
                                border: isMe ? 'none' : '1px solid var(--border)'
                              }}
                            >
                              {msg.content}

                              {msg.taskId && (
                                <div
                                  className={`mt-2 p-2 rounded-xl flex items-center gap-2 border text-[11px] font-semibold ${
                                    isMe
                                      ? 'bg-black/20 border-white/20 text-white'
                                      : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                  }`}
                                >
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Card: {msg.taskTitle || 'Shared Card'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t flex flex-col gap-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card-alt)' }}
                >
                  {selectedTaskToShare && (
                    <div className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Attached Card: {topics.find(t => t.id === selectedTaskToShare)?.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedTaskToShare('')}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTaskPickerOpen(!isTaskPickerOpen)}
                      className="p-2 rounded-xl border hover:bg-slate-500/10 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--border)' }}
                      title="Attach a card to chat"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder="Type encrypted message to team..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      className="input-base text-xs py-2 flex-1"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim() && !selectedTaskToShare}
                      className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>

                  {isTaskPickerOpen && (
                    <div className="p-2 rounded-xl border bg-slate-900 text-xs space-y-1 max-h-36 overflow-y-auto">
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Attach Card to Chat:</span>
                      {topics.slice(0, 10).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTaskToShare(t.id);
                            setIsTaskPickerOpen(false);
                          }}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 truncate font-medium flex items-center gap-1.5"
                        >
                          <span className="text-blue-400 font-mono text-[10px]">#</span>
                          <span className="truncate">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            ) : (
              /* Live Audio / Video Call Panel */
              <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-slate-950">
                {activeCall?.active ? (
                  <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                    {/* Active Call Header */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-bold text-white uppercase tracking-wider">
                          Live {activeCall.type === 'video' ? 'Video' : 'Audio'} Room
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ⏱️ {formatCallTime(activeCall.durationSeconds)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>P2P Encrypted</span>
                        </span>
                      </div>
                    </div>

                    {/* Participant Video/Audio Grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
                      {/* Built-in Screen Share Tile if Active */}
                      {activeCall.isScreenSharing && (
                        <div className="col-span-full relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-blue-500 shadow-2xl flex flex-col min-h-[220px]">
                          <div className="px-3 py-1.5 bg-blue-600/90 text-white text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ScreenShare className="w-4 h-4 animate-pulse" />
                              <span>🖥️ Live Screen Sharing ({profile.name || 'You'})</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleToggleScreenShare}
                              className="px-2 py-0.5 rounded bg-white text-blue-700 text-[10px] font-extrabold hover:bg-slate-100 transition cursor-pointer"
                            >
                              Stop Sharing
                            </button>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-1 bg-black">
                            <video
                              ref={el => {
                                screenVideoRef.current = el;
                                const s = RealtimeCollab.getScreenStream();
                                if (el && s && el.srcObject !== s) {
                                  el.srcObject = s;
                                }
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full max-h-[280px] object-contain rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      {/* Local User Tile */}
                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg min-h-[160px]">
                        {activeCall.isVideoOn ? (
                          <video
                            ref={el => {
                              localVideoRef.current = el;
                              const s = RealtimeCollab.getLocalStream();
                              if (el && s && el.srcObject !== s) {
                                el.srcObject = s;
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xl ${
                              !activeCall.isMuted ? 'ring-4 ring-emerald-500 animate-pulse' : ''
                            }`} style={{ background: '#0C66E4' }}>
                              {(profile.name || 'You').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-white">{profile.name || 'You'} (You)</span>
                            {!activeCall.isMuted && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Radio className="w-3 h-3 animate-pulse" /> Speaking
                              </span>
                            )}
                          </div>
                        )}

                        {/* Name badge */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                          <span>{profile.name || 'You'} (You)</span>
                          {activeCall.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                        </div>
                      </div>

                      {/* Remote Teammates (Only selected participants) */}
                      {activeCall.participants.map(p => (
                        <div
                          key={p.id}
                          className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-lg p-4 min-h-[160px]"
                        >
                          {remoteMediaStream && remoteMediaStream.getVideoTracks().length > 0 ? (
                            <video
                              ref={el => {
                                remoteVideoRef.current = el;
                                if (el && remoteMediaStream && el.srcObject !== remoteMediaStream) {
                                  el.srcObject = remoteMediaStream;
                                }
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 p-4">
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-xl ${
                                  p.isSpeaking ? 'ring-4 ring-emerald-500 animate-pulse' : ''
                                }`}
                                style={{ background: p.color || '#EC4899' }}
                              >
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-white mt-2">{p.name}</span>
                              <span className="text-[10px] text-emerald-400 font-mono">Connected</span>
                            </div>
                          )}

                          {/* Hidden unmuted audio element ensuring remote audio ALWAYS plays */}
                          <audio
                            autoPlay
                            playsInline
                            ref={el => {
                              if (el && remoteMediaStream && el.srcObject !== remoteMediaStream) {
                                el.srcObject = remoteMediaStream;
                                el.play().catch(() => {});
                              }
                            }}
                            className="hidden"
                          />

                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Active Controls Bar */}
                    <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                      <button
                        type="button"
                        onClick={toggleCallMute}
                        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
                          activeCall.isMuted
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                        title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                      >
                        {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={toggleCallVideo}
                        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
                          !activeCall.isVideoOn
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                        title={activeCall.isVideoOn ? 'Turn Video Off' : 'Turn Video On'}
                      >
                        {activeCall.isVideoOn ? <Video className="w-5 h-5 text-blue-400" /> : <VideoOff className="w-5 h-5" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleScreenShare}
                        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
                          activeCall.isScreenSharing
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                        title={activeCall.isScreenSharing ? 'Stop Screen Share' : 'Share Screen (Built-in)'}
                      >
                        <ScreenShare className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleEndCall}
                        className="p-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                        title="End Call"
                      >
                        <PhoneOff className="w-5 h-5" />
                        <span className="text-xs">End Call</span>
                      </button>
                    </div>
                  </div>
                ) : outgoingCall && outgoingCall.status === 'ringing' ? (
                  /* Calling / Outgoing Ringing Screen */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white relative bg-slate-950 animate-in fade-in">
                    {/* Animated radar pulse rings */}
                    <div className="relative my-6 flex items-center justify-center">
                      <span className="absolute w-44 h-44 rounded-full bg-blue-500/15 animate-ping duration-1000" />
                      <span className="absolute w-32 h-32 rounded-full bg-blue-500/25 animate-pulse" />
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl relative z-10 border-4 border-blue-400/40">
                        {outgoingCall.targetNames[0] ? outgoingCall.targetNames[0].slice(0, 2).toUpperCase() : 'DW'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-2 mb-8 max-w-sm">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Ringing Teammate • {formatCallTime(outgoingCall.ringingSeconds)}</span>
                      </div>

                      <h3 className="text-2xl font-black text-white tracking-tight">
                        {outgoingCall.targetNames.join(', ')}
                      </h3>

                      <p className="text-xs text-slate-400 font-medium">
                        Calling on workspace: <strong className="text-slate-200">"{outgoingCall.boardName}"</strong>
                      </p>

                      <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                        Waiting for teammate to accept... Meeting will connect as soon as at least one person answers.
                      </p>
                    </div>

                    {/* Cancel Calling Button */}
                    <button
                      type="button"
                      onClick={cancelOutgoingCall}
                      className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-xl shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Cancel Call</span>
                    </button>
                  </div>
                ) : (
                  /* No call in progress - Lobby with Participant Selection */
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4 text-white">
                    <div className="w-14 h-14 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xl">
                      <Video className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white">Instant Encrypted Live Call</h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Select which collaborators to call. Invited members receive an accept/decline alert.
                      </p>
                    </div>

                    {/* Participant Selection Box */}
                    <div className="w-full max-w-sm p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Select Teammates to Call
                        </span>
                        {effectiveCallable.length > 0 && (
                          <button
                            type="button"
                            onClick={handleToggleAllMembers}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            {selectedMemberIds.length === effectiveCallable.length ? 'Clear Selection' : 'Select All'}
                          </button>
                        )}
                      </div>

                      {effectiveCallable.length === 0 ? (
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-300">No other teammates on this board yet</p>
                          <p className="text-[11px] text-slate-500 mt-1">Invite teammates by their email to start group voice or video calls!</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {effectiveCallable.map(m => {
                            const isSelected = selectedMemberIds.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-600/15 border-blue-500/40 text-white'
                                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleMember(m.id)}
                                    className="rounded accent-blue-600"
                                  />
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                    style={{ backgroundColor: m.color || '#0C66E4' }}
                                  >
                                    {m.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-200 truncate">{m.name}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-400">
                                  {m.role}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {effectiveCallable.length > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Calling: <strong className="text-slate-300">{selectedMemberIds.length}</strong> of {effectiveCallable.length} teammate(s).
                        </p>
                      )}
                    </div>

                    {/* Launch Call Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={selectedMemberIds.length === 0}
                        onClick={() => startCall('video', selectedMemberIds)}
                        className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 font-bold shadow-lg disabled:opacity-40 cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>Start Video Call ({selectedMemberIds.length})</span>
                      </button>

                      <button
                        type="button"
                        disabled={selectedMemberIds.length === 0}
                        onClick={() => startCall('audio', selectedMemberIds)}
                        className="btn-secondary text-xs px-4 py-2.5 flex items-center gap-2 font-bold bg-slate-800 text-white border-slate-700 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4 text-emerald-400" />
                        <span>Voice Only ({selectedMemberIds.length})</span>
                      </button>
                    </div>

                    {/* Test Incoming Call Prompt Trigger */}
                    {effectiveCallable.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => simulateIncomingCall({ name: effectiveCallable[0]?.name || 'Teammate', color: effectiveCallable[0]?.color || '#EC4899' })}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition cursor-pointer"
                          title="Simulate an incoming call to preview the Accept / Decline alert"
                        >
                          <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Test Incoming Call Alert (Accept / Decline)</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" /> End-to-end encrypted
                      </span>
                      <span>•</span>
                      <span>Built-in Screen Share</span>
                      <span>•</span>
                      <span>Individual Calling Selection</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Active Members List (only visible in full mode on desktop) */}
          {windowMode === 'full' && (
            <div className="w-56 border-l p-4 hidden md:flex flex-col justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-card-alt)' }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Members</span>
                  </span>
                  <span>{members.length}</span>
                </div>

                <div className="space-y-2">
                  {members.map(m => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl flex items-center gap-2 border bg-white/40 dark:bg-slate-800/40 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                        style={{ backgroundColor: m.color || '#0C66E4' }}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate min-w-0">
                        <div className="font-bold truncate text-[11px]" style={{ color: 'var(--text-primary)' }}>
                          {m.name}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">{m.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-blue-600 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Tip
                </span>
                <span>Mention collaborators using <strong>@Name</strong> in card titles to assign work instantly.</span>
              </div>
            </div>
          )}
        </div>
    </>
  );

  if (windowMode === 'floating') {
    return (
      <aside
        aria-label="Floating Collaboration Window"
        className="fixed bottom-5 right-5 z-40 w-[420px] max-w-[calc(100vw-1.5rem)] h-[540px] max-h-[82vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-150"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(59, 130, 246, 0.25)'
        }}
      >
        {windowInnerMarkup}
      </aside>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
      onClick={() => setWindowMode('floating')}
    >
      <div
        className="w-full max-w-4xl h-[88vh] max-h-[760px] flex flex-col rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {windowInnerMarkup}
      </div>
    </div>
  );
};
