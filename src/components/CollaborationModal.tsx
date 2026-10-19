import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserPlus, Copy, Check, Trash2, X, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';
import { StorageService } from '../services/storage';
import { UserProfile } from '../types';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen, onClose }) => {
  const { activeBoard, addBoardMember, removeBoardMember, profile, sendCollabNotification } = useApp();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [validationError, setValidationError] = useState<string>('');
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      const users = StorageService.getRegisteredUsers();
      setRegisteredUsers(users);
      setInviteEmail('');
      setInviteName('');
      setValidationError('');
      setMatchedUser(null);
    }
  }, [isOpen]);

  if (!isOpen || !activeBoard) return null;

  const members = activeBoard.members || [];

  const handleEmailChange = (val: string) => {
    setInviteEmail(val);
    const trimmed = val.trim().toLowerCase();

    if (!trimmed) {
      setValidationError('');
      setMatchedUser(null);
      return;
    }

    const found = registeredUsers.find(u => u.email.toLowerCase() === trimmed);
    if (found) {
      // Check if already in board
      const isAlreadyMember = members.some(m => m.email.toLowerCase() === trimmed);
      if (isAlreadyMember) {
        setValidationError(`"${found.name || trimmed}" is already a member of this board.`);
        setMatchedUser(null);
      } else {
        setValidationError('');
        setMatchedUser(found);
        setInviteName(found.name || '');
      }
    } else {
      setMatchedUser(null);
      setValidationError('No existing Deepwork user found with this email. Invites can only be sent to registered users.');
    }
  };

  const handleSelectQuickUser = (user: UserProfile) => {
    setInviteEmail(user.email);
    setInviteName(user.name || '');
    setMatchedUser(user);
    setValidationError('');
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const trimmed = inviteEmail.trim().toLowerCase();
    const existing = StorageService.findUserByEmail(trimmed);

    if (!existing) {
      setValidationError('No existing Deepwork user found with this email. Collaboration invites can only be sent to existing users.');
      Haptics.warning();
      return;
    }

    if (members.some(m => m.email.toLowerCase() === trimmed)) {
      setValidationError('This user is already a collaborator on this board.');
      Haptics.warning();
      return;
    }

    Haptics.success();
    addBoardMember(activeBoard.id, {
      name: existing.name || inviteName.trim() || existing.email,
      email: existing.email,
      role: inviteRole,
    });

    // Dispatch interactive notification to the user
    sendCollabNotification({
      type: 'collab_invite',
      title: 'Board Collaboration Invite',
      message: `${profile.name || 'A teammate'} invited you to collaborate on "${activeBoard.name}"`,
      boardId: activeBoard.id,
      boardName: activeBoard.name,
      senderName: profile.name || 'Board Lead',
      senderAvatar: profile.avatar || profile.avatarUrl,
      senderColor: '#0C66E4'
    });

    Notifications.toast('success', `👥 Invite sent to existing user "${existing.name || existing.email}"!`);
    setInviteName('');
    setInviteEmail('');
    setMatchedUser(null);
    setValidationError('');
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?joinBoard=${encodeURIComponent(activeBoard.id)}&boardName=${encodeURIComponent(activeBoard.name)}&inviter=${encodeURIComponent(profile.name || profile.email || 'Team Lead')}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    Haptics.notification();
    Notifications.toast('success', '🔗 Collaboration invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Candidates among registered users not yet added (strictly exclude current logged-in user!)
  const myEmail = (profile.email || '').trim().toLowerCase();
  const availableRegisteredUsers = registeredUsers.filter(
    u => u.email && 
         u.email.trim().toLowerCase() !== myEmail &&
         !members.some(m => m.email.trim().toLowerCase() === u.email.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Board Collaborators
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeBoard.name} • {members.length} active member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shareable Link Box */}
        <div className="p-3 rounded-xl flex items-center justify-between gap-2" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Invite Link</p>
            <p className="text-xs truncate text-slate-500 font-mono">
              {window.location.origin}/?joinBoard={activeBoard.id.substring(0, 8)}...
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

        {/* Invite Member Form: Only Existing Users */}
        <form onSubmit={handleInvite} className="p-3.5 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Invite Existing Deepwork User</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">
              Email Lookup Only
            </span>
          </div>

          <div>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Enter existing user's registered email..."
                value={inviteEmail}
                onChange={e => handleEmailChange(e.target.value)}
                className="input-base text-xs py-2 w-full pr-8"
              />
              {matchedUser && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Validation Feedback */}
            {matchedUser && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified user: <strong>{matchedUser.name}</strong> ({matchedUser.email})</span>
              </div>
            )}

            {validationError && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 leading-snug">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Quick Add Existing Teammates Chips */}
          {availableRegisteredUsers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                Quick Select Registered Users:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {availableRegisteredUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectQuickUser(u)}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                    style={{
                      background: inviteEmail.toLowerCase() === u.email.toLowerCase() ? 'var(--accent-soft)' : 'var(--bg-card)',
                      borderColor: inviteEmail.toLowerCase() === u.email.toLowerCase() ? 'var(--accent)' : 'var(--border)',
                      color: inviteEmail.toLowerCase() === u.email.toLowerCase() ? 'var(--accent)' : 'var(--text-primary)'
                    }}
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {(u.name || u.email).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-semibold">{u.name || u.email.split('@')[0]}</span>
                    <span className="text-[10px] text-slate-400">({u.email})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
              disabled={!matchedUser || Boolean(validationError)}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Send Invite</span>
            </button>
          </div>
        </form>

        {/* Current Members List */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Current Members ({members.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
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
                      {member.role === 'owner' ? `${profile.name || member.name.replace(' (Owner)', '') || 'You'} (Owner)` : member.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {member.role === 'owner' ? (profile.email || member.email) : member.email}
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
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
