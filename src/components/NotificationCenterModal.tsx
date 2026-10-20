import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  CheckCircle2,
  Calendar,
  UserCheck,
  Check,
  Trash2,
  ExternalLink,
  Play,
  Clock,
  Sparkles,
  Inbox
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const NotificationCenterModal: React.FC = () => {
  const {
    notifications,
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    respondToNotification,
    clearNotification,
    topics,
    setActiveFocusTopic,
    setActiveTab,
    setActiveBoardId
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'invites' | 'delegated'>('all');

  if (!isNotificationCenterOpen) return null;

  const filtered = notifications.filter(n => {
    if (filter === 'invites') return n.type === 'collab_invite';
    if (filter === 'delegated') return n.type === 'task_delegated';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => setIsNotificationCenterOpen(false)}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Collaboration invites, delegated work, and team mentions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  Haptics.tap();
                  markAllNotificationsAsRead();
                }}
                className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
                title="Mark all as read"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNotificationCenterOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-2.5 border-b flex items-center gap-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-card-alt)' }}>
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'invites', label: 'Board Invites', count: notifications.filter(n => n.type === 'collab_invite').length },
            { id: 'delegated', label: 'Delegated Tasks', count: notifications.filter(n => n.type === 'task_delegated').length }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                Haptics.tap();
                setFilter(t.id as any);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length > 0 ? (
            filtered.map(notif => {
              const isUnread = !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (isUnread) markNotificationAsRead(notif.id);
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    isUnread
                      ? 'border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-xs"
                        style={{ backgroundColor: notif.senderColor || '#0C66E4' }}
                      >
                        {notif.senderName.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                            {notif.senderName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                            style={{
                              backgroundColor: notif.type === 'collab_invite' ? '#EC489915' : notif.type === 'task_delegated' ? '#0C66E415' : '#10B98115',
                              borderColor: notif.type === 'collab_invite' ? '#EC489930' : notif.type === 'task_delegated' ? '#0C66E430' : '#10B98130',
                              color: notif.type === 'collab_invite' ? '#EC4899' : notif.type === 'task_delegated' ? '#0C66E4' : '#10B981'
                            }}
                          >
                            {notif.type === 'collab_invite' ? '🚀 Board Invite' : notif.type === 'task_delegated' ? '👤 Delegated' : '💬 Mention'}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>

                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(notif.timestamp)}</span>
                          {notif.boardName && <span>• Board: #{notif.boardName}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        Haptics.tap();
                        clearNotification(notif.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Interactive Action Buttons */}
                  {notif.type === 'collab_invite' && (
                    <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                      {notif.status === 'accepted' ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Invite accepted • Active member
                        </span>
                      ) : notif.status === 'declined' ? (
                        <span className="text-xs font-semibold text-slate-400">
                          Invite declined
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              respondToNotification(notif.id, 'accept');
                              if (notif.boardId) setActiveBoardId(notif.boardId);
                              setActiveTab('study');
                            }}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Invite</span>
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              respondToNotification(notif.id, 'decline');
                            }}
                            className="btn-secondary text-xs px-2.5 py-1.5 text-slate-400 hover:text-slate-600"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {notif.type === 'task_delegated' && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Added directly to your board</span>
                      </span>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          markNotificationAsRead(notif.id);
                          if (notif.boardId) {
                            setActiveBoardId(notif.boardId);
                          }
                          setActiveTab('study');
                          setIsNotificationCenterOpen(false);
                        }}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View on Board</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-xs font-semibold">No notifications right now</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                You're all caught up. When teammates invite you to boards or delegate cards using @mention, they will show up here.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between text-xs text-slate-400" style={{ borderColor: 'var(--border)', background: 'var(--bg-card-alt)' }}>
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Type <strong>@</strong> in card titles to delegate tasks instantly</span>
          </span>
          <button
            type="button"
            onClick={() => setIsNotificationCenterOpen(false)}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
