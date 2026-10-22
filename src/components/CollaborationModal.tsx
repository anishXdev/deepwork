import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Users, UserPlus, Copy, Check, Trash2, X, AlertCircle, CheckCircle2, Key, Loader2, Sparkles } from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';
import { StorageService, generateBoardInviteCode } from '../services/storage';
import { UserProfile } from '../types';
import { CallButton } from './calling/CallButton';
import { makeSecureBoardJoinCode } from '../utils/boardInvite';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen, onClose }) => {
  const { activeBoard, addBoardMember, removeBoardMember, profile, sendCollabNotification, startCall, onlineMemberEmails } = useApp();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedCode, setCopiedCode] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [validationError, setValidationError] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [matchedUser, setMatchedUser] = useState<UserProfile | null>(null);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  const normalizeEmail = (val: string) => {
    let clean = (val || '').trim().toLowerCase();
    if (clean.endsWith('@gamil.com')) {
      clean = clean.replace('@gamil.com', '@gmail.com');
    }
    return clean;
  };

  useEffect(() => {
    if (isOpen) {
      // 1. Initial immediate local directory
      const localUsers = StorageService.getRegisteredUsers();
      setRegisteredUsers(localUsers);
      setInviteEmail('');
      setInviteName('');
      setValidationError('');
      setInfoMessage('');
      setMatchedUser(null);
      setIsSearchingRemote(false);

      // 2. Fetch and merge latest registered users across MongoDB Atlas
      StorageService.syncRegisteredUsersFromCloud().then(cloudUsers => {
        if (cloudUsers && cloudUsers.length > 0) {
          setRegisteredUsers(cloudUsers);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen || !activeBoard) return null;

  const members = activeBoard.members || [];
  const inviteCode = activeBoard.inviteCode || generateBoardInviteCode(activeBoard.id);
  const secureJoinCode = activeBoard.encryptionKey ? makeSecureBoardJoinCode(inviteCode, activeBoard.encryptionKey) : inviteCode;

  const handleEmailChange = async (val: string) => {
    setInviteEmail(val);
    setInfoMessage('');
    const normalized = normalizeEmail(val);

    if (!normalized) {
      setValidationError('');
      setMatchedUser(null);
      return;
    }

    // Check if typo was corrected
    if (val.trim().toLowerCase().endsWith('@gamil.com')) {
      setInfoMessage('Auto-correcting "@gamil.com" to "@gmail.com"');
    }

    // 1. Check local registered list
    const found = registeredUsers.find(u => normalizeEmail(u.email) === normalized);
    if (found) {
      const isAlreadyMember = members.some(m => normalizeEmail(m.email) === normalized);
      if (isAlreadyMember) {
        setValidationError(`"${found.name || normalized}" is already a member of this board.`);
        setMatchedUser(null);
      } else {
        setValidationError('');
        setMatchedUser(found);
        setInviteName(found.name || '');
      }
      return;
    }

    // 2. If it contains @ and domain, trigger live cloud lookup in MongoDB Atlas
    if (normalized.includes('@') && normalized.includes('.')) {
      setIsSearchingRemote(true);
      try {
        const remoteUser = await StorageService.lookupUserRemote(normalized);
        setIsSearchingRemote(false);
        if (remoteUser) {
          const isAlreadyMember = members.some(m => normalizeEmail(m.email) === normalizeEmail(remoteUser.email));
          if (isAlreadyMember) {
            setValidationError(`"${remoteUser.name || remoteUser.email}" is already a member of this board.`);
            setMatchedUser(null);
          } else {
            setValidationError('');
            setMatchedUser(remoteUser);
            setInviteName(remoteUser.name || '');
            setRegisteredUsers(prev => {
              if (!prev.some(u => normalizeEmail(u.email) === normalizeEmail(remoteUser.email))) {
                return [...prev, remoteUser];
              }
              return prev;
            });
          }
          return;
        }
      } catch {
        setIsSearchingRemote(false);
      }
    }

    // 3. Fallback: email not found in cloud directory yet
    setMatchedUser(null);
    if (normalized.includes('@') && normalized.includes('.')) {
      setValidationError('');
      setInfoMessage('User not found in directory. You can still send an invite and share the secure join code below.');
    } else {
      setValidationError('');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const normalized = normalizeEmail(inviteEmail);

    if (members.some(m => normalizeEmail(m.email) === normalized)) {
      setValidationError('This user is already a collaborator on this board.');
      Haptics.warning();
      return;
    }

    // Retrieve or remote-lookup user
    let targetUser = matchedUser;
    if (!targetUser) {
      targetUser = await StorageService.lookupUserRemote(normalized) || StorageService.findUserByEmail(normalized) || null;
    }

    const finalEmail = targetUser ? targetUser.email : (normalized.includes('@') ? normalized : inviteEmail.trim());
    const finalName = targetUser?.name || inviteName.trim() || finalEmail.split('@')[0];

    Haptics.success();
    addBoardMember(activeBoard.id, {
      name: finalName,
      email: finalEmail,
      role: inviteRole,
    });

    // Dispatch interactive notification to the user
    sendCollabNotification({
      type: 'collab_invite',
      title: 'Board Collaboration Invite',
      message: `${profile.name || 'A teammate'} invited you to collaborate on "${activeBoard.name}"`,
      recipientEmail: finalEmail,
      senderEmail: profile.email || '',
      boardId: activeBoard.id,
      boardName: activeBoard.name,
      inviteCode: secureJoinCode,
      senderName: profile.name || 'Board Lead',
      senderAvatar: profile.avatar || profile.avatarUrl,
      senderColor: '#0C66E4'
    });

    Notifications.toast('info', `Share the secure join code below privately with ${finalName}.`);
    setInviteName('');
    setInviteEmail('');
    setMatchedUser(null);
    setValidationError('');
    setInfoMessage('');
  };



  const handleCopyJoinCode = () => {
    navigator.clipboard.writeText(secureJoinCode);
    setCopiedCode(true);
    Haptics.notification();
    Notifications.toast('success', 'Secure board join code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

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

        {/* Secure board join code */}
        <div className="p-3.5 rounded-xl space-y-2.5" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Key className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure board join code</p>
              <p className="text-[11px] text-slate-500">Share this code privately. It includes the board’s encryption key so teammates can unlock the shared board.</p>
            </div>
          </div>
          <div className="rounded-lg border px-3 py-2 font-mono text-[10px] leading-5 break-all select-all" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{secureJoinCode}</div>
          <button type="button" onClick={handleCopyJoinCode} className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2">
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Join code copied' : 'Copy secure join code'}</span>
          </button>
        </div>

        {/* Invite Member Form: User Directory Lookup */}
        <form onSubmit={handleInvite} className="p-3.5 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Invite Deepwork User</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">
              Live Cloud Lookup
            </span>
          </div>

          <div>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Enter user's registered email (e.g. anish4d@gmail.com)..."
                value={inviteEmail}
                onChange={e => handleEmailChange(e.target.value)}
                className="input-base text-xs py-2 w-full pr-8"
              />
              {isSearchingRemote && (
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
              {!isSearchingRemote && matchedUser && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Validation & Match Feedback */}
            {matchedUser && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Verified user: <strong>{matchedUser.name}</strong> ({matchedUser.email})</span>
              </div>
            )}

            {infoMessage && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400 leading-snug">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {validationError && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500 leading-snug">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
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
              disabled={!inviteEmail.trim() || Boolean(validationError)}
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
            {members.map(member => {
              const isOnline = onlineMemberEmails.includes((member.email || '').trim().toLowerCase());
              return (
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
                    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${isOnline ? 'text-emerald-500' : 'text-slate-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
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
                    <>
                      <CallButton
                        variant="icon-only"
                        targetMemberId={member.id}
                        targetMemberName={member.name}
                        disabled={!isOnline}
                        onStartCall={(type, id) => {
                          onClose();
                          startCall(type, id ? [id] : undefined);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeBoardMember(activeBoard.id, member.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
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
