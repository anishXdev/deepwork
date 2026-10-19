import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserPlus, Copy, Check, Trash2, Shield, X, Mail } from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen, onClose }) => {
  const { activeBoard, addBoardMember, removeBoardMember } = useApp();

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !activeBoard) return null;

  const members = activeBoard.members || [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    Haptics.success();
    addBoardMember(activeBoard.id, {
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    setInviteName('');
    setInviteEmail('');
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/board/${encodeURIComponent(activeBoard.id)}?invite=team`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    Haptics.notification();
    Notifications.toast('success', '🔗 Collaboration invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Board Collaborators
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeBoard.name} • {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shareable Link Box */}
        <div className="p-3 rounded-xl flex items-center justify-between gap-2" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invite with Link</p>
            <p className="text-xs truncate text-slate-500 font-mono">
              {window.location.origin}/board/{activeBoard.id.substring(0, 10)}...
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Invite Member Form */}
        <form onSubmit={handleInvite} className="p-3 rounded-xl space-y-2.5" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Teammate or Collaborator</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Full name (e.g. Alex Rivera)"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              className="input-base text-xs py-1.5"
            />
            <input
              type="email"
              required
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="input-base text-xs py-1.5"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Role:</span>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="input-base text-xs py-1 px-2"
              >
                <option value="editor">Editor (Can edit & move cards)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!inviteName.trim() || !inviteEmail.trim()}
              className="btn-primary text-xs px-3 py-1 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              <span>Invite</span>
            </button>
          </div>
        </form>

        {/* Members List */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Current Members ({members.length})
          </h4>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {members.map(member => (
              <div
                key={member.id}
                className="p-2 rounded-xl flex items-center justify-between gap-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: member.color || '#0C66E4' }}
                  >
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {member.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase"
                    style={{
                      background: member.role === 'owner' ? 'var(--accent-soft)' : 'var(--bg-card-alt)',
                      color: member.role === 'owner' ? 'var(--accent)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {member.role}
                  </span>

                  {member.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => removeBoardMember(activeBoard.id, member.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs px-4 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
