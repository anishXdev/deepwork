import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleAuthService } from '../services/googleAuth';
import { StorageService } from '../services/storage';
import { CloudSyncService } from '../services/cloudSync';
import { E2EE } from '../services/e2ee';
import { UserProfile } from '../types';
import {
  X,
  Cloud,
  Smartphone,
  Globe,
  Calendar,
  Check,
  Download,
  Upload,
  AlertCircle,
  Sparkles,
  Copy,
  RefreshCw,
  Database
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const GoogleSyncModal: React.FC = () => {
  const {
    isSyncModalOpen,
    setIsSyncModalOpen,
    profile,
    updateProfile,
    syncKey,
    updateSyncKey,
    syncWithCloudNow,
    cloudSyncStatus,
    lastSyncedAt
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'cloud' | 'account' | 'backup'>('cloud');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState(() => E2EE.getOrCreateRecoveryKey());
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);
  const [mongoStatus, setMongoStatus] = useState<{ connected: boolean; cluster?: string; database?: string } | null>(null);

  useEffect(() => {
    if (isSyncModalOpen) {
      GoogleAuthService.loadGoogleScript().catch(err => {
        console.warn('Preloading Google Identity Services script:', err);
      });
      GoogleAuthService.fetchBackendConfig();
      CloudSyncService.checkMongoDBStatus().then(st => {
        setMongoStatus(st);
      });
    }
  }, [isSyncModalOpen]);

  if (!isSyncModalOpen) return null;

  const handleCopyKey = () => {
    Haptics.tap();
    navigator.clipboard.writeText(syncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSyncKey.trim()) return;
    Haptics.success();
    await updateSyncKey(inputSyncKey.trim().toUpperCase());
    setPairSuccess(true);
    setInputSyncKey('');
    setTimeout(() => setPairSuccess(false), 3000);
  };

  const handleDemoSignIn = () => {
    Haptics.tap();
    setErrorMessage(null);
    const demoUser = GoogleAuthService.signInWithDemoUser();
    updateProfile(demoUser);
  };

  const handleSignOut = () => {
    Haptics.tap();
    setErrorMessage(null);
    const guestUser = GoogleAuthService.signOut();
    updateProfile(guestUser);
  };

  const handleGoogleRealSignIn = async () => {
    Haptics.tap();
    setErrorMessage(null);
    setIsAuthenticating(true);

    try {
      await GoogleAuthService.initGoogleTokenClient(
        (_token: string, updatedProfile: Partial<UserProfile>) => {
          setIsAuthenticating(false);
          updateProfile(updatedProfile);
        },
        (err: any) => {
          setIsAuthenticating(false);
          setErrorMessage(err?.message || 'Failed to authenticate with Google.');
        }
      );
    } catch (err: any) {
      setIsAuthenticating(false);
      setErrorMessage(err?.message || 'Failed to initialize Google Authentication.');
    }
  };

  const handleExportData = async () => {
    Haptics.tap();
    const data = StorageService.exportAllData();
    const backup = { encrypted: true, payload: await E2EE.encrypt(data, recoveryKey) };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepwork-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Haptics.tap();
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.encrypted && parsed.payload) {
          void E2EE.decrypt<any>(parsed.payload, recoveryKey).then(clear => { StorageService.importData(clear); window.location.reload(); }).catch(() => setErrorMessage('Could not decrypt this backup. Enter its recovery key first.'));
          return;
        }
        StorageService.importData(parsed);
        window.location.reload();
      } catch {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const tabBtnStyle = (active: boolean) => ({
    flex: 1,
    padding: '6px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '12px',
    transition: 'all 0.15s',
    background: active ? 'var(--bg-card)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full sm:max-w-lg max-sm:rounded-t-2xl sm:rounded-2xl p-6 space-y-5 max-sm:max-h-[88vh] overflow-y-auto"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 rounded-full mx-auto mb-2" style={{ background: 'var(--border)' }} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Cloud Sync & Data</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cross-device real-time synchronization</p>
            </div>
          </div>

          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
          {(['cloud', 'account', 'backup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { Haptics.tap(); setActiveSubTab(tab); }}
              style={tabBtnStyle(activeSubTab === tab)}
            >
              {tab === 'cloud' ? 'Cloud Database' : tab === 'account' ? 'Google' : 'Backup'}
            </button>
          ))}
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#b45309' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Tab 1: Cloud Database */}
        {activeSubTab === 'cloud' && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="p-3.5 rounded-xl flex items-center justify-between"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>MongoDB Atlas Cloud</span>
                  </div>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: '#10b981' }}>Automatic cloud persistence active</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                Connected
              </span>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>End-to-end recovery key</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Your cloud snapshot is encrypted in this browser. Save this key somewhere safe; you need it to restore data on another device.</p>
              </div>
              <div className="flex gap-2">
                <input readOnly value={recoveryKey} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-[10px] font-mono" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} aria-label="Recovery key" />
                <button className="btn-secondary px-3 text-xs" onClick={async () => { await navigator.clipboard.writeText(recoveryKey); setRecoveryCopied(true); setTimeout(() => setRecoveryCopied(false), 1800); }}>{recoveryCopied ? 'Copied' : 'Copy'}</button>
              </div>
              <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); try { E2EE.setRecoveryKey(recoveryInput); setRecoveryKey(E2EE.getRecoveryKey()); setRecoveryInput(''); setErrorMessage(null); const restored = await CloudSyncService.pullFromCloud(); if (restored.success && restored.found) window.location.reload(); else setErrorMessage(restored.error || 'No encrypted cloud backup was found for this account.'); } catch (err: any) { setErrorMessage(err.message || 'Invalid recovery key'); } }}>
                <input value={recoveryInput} onChange={e => setRecoveryInput(e.target.value)} placeholder="Restore with a saved recovery key" className="min-w-0 flex-1 rounded-lg px-2 py-2 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <button className="btn-secondary px-3 text-xs" type="submit">Restore</button>
              </form>
            </div>

            {/* Cloud Workspace Card */}
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Cloud Account Linked</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-slate-400'}`} />
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {cloudSyncStatus === 'syncing' ? 'Syncing...' : cloudSyncStatus === 'synced' ? 'Synced' : 'Ready'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  {(profile.name || profile.email || 'DW').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.name || 'Deepwork Member'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {profile.email || 'Cloud workspace active'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Real-time database sync active'}
                </span>
                <button
                  onClick={async () => { Haptics.tap(); await syncWithCloudNow(); }}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="btn-primary flex items-center gap-1.5 active:scale-95 disabled:opacity-50 text-xs py-1.5 px-3"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Google Account */}
        {activeSubTab === 'account' && (
          <div className="space-y-4">
            {profile.googleConnected ? (
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-3">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                      style={{ border: '1px solid rgba(16,185,129,0.3)' }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{profile.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Connected</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="btn-secondary text-xs"
                  >
                    Disconnect
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Auto-Schedule to Google Calendar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.googleCalendarSyncEnabled}
                    onChange={e => updateProfile({ googleCalendarSyncEnabled: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl text-center space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sign In with Google</h4>
                  <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                    Sync tasks across all your devices and schedule sessions into Google Calendar.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                  <button
                    onClick={handleDemoSignIn}
                    className="btn-primary flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Instant Demo Account</span>
                  </button>
                  <button
                    onClick={handleGoogleRealSignIn}
                    disabled={isAuthenticating}
                    className="btn-secondary flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Backup */}
        {activeSubTab === 'backup' && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Transfer your subjects, topics, and completed sessions between devices anytime with one-click JSON backup.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="p-4 rounded-xl text-center space-y-2 transition-colors group"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <Download className="w-6 h-6 mx-auto group-hover:scale-110 transition-transform" style={{ color: 'var(--accent)' }} />
                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Export Backup</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Download .json data</div>
              </button>

              <label
                className="p-4 rounded-xl text-center space-y-2 transition-colors cursor-pointer group"
                style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <Upload className="w-6 h-6 text-emerald-500 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Import Backup</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Restore from .json file</div>
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="btn-secondary text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
