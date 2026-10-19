import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleAuthService } from '../services/googleAuth';
import { StorageService } from '../services/storage';
import { CloudSyncService } from '../services/cloudSync';
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

  const [activeSubTab, setActiveSubTab] = useState<'devicesync' | 'account' | 'backup'>('devicesync');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
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

  const handleExportData = () => {
    Haptics.tap();
    const data = StorageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dstudy-backup-${new Date().toISOString().split('T')[0]}.json`;
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
            <div className="p-2 rounded-xl" style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.2)' }}>
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
          {(['devicesync', 'account', 'backup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { Haptics.tap(); setActiveSubTab(tab); }}
              style={tabBtnStyle(activeSubTab === tab)}
            >
              {tab === 'devicesync' ? 'Device Sync' : tab === 'account' ? 'Google' : 'Backup'}
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

        {/* Tab 1: Device Sync */}
        {activeSubTab === 'devicesync' && (
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
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Cloud Sync</span>
                  </div>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: '#10b981' }}>Automatic real-time data sync active</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                Connected
              </span>
            </div>

            {/* Sync Key */}
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Your Device Sync Key</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-slate-400'}`} />
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {cloudSyncStatus === 'syncing' ? 'Syncing...' : cloudSyncStatus === 'synced' ? 'Synced' : 'Ready'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="font-mono text-base font-black tracking-wider flex-1 select-all px-2" style={{ color: 'var(--accent)' }}>
                  {syncKey}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.2)' }}
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Real-time sync active'}
                </span>
                <button
                  onClick={async () => { Haptics.tap(); await syncWithCloudNow(); }}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="btn-primary flex items-center gap-1.5 active:scale-95 disabled:opacity-50 text-xs py-1.5 px-3"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>
            </div>

            {/* Pair Another Device */}
            <form onSubmit={handlePairDevice} className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Smartphone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Pair Another Device
                </h4>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Enter your phone or laptop&apos;s key below to link both devices immediately.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. PULSE-ABCD12"
                  value={inputSyncKey}
                  onChange={e => setInputSyncKey(e.target.value)}
                  className="input-base flex-1 font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={!inputSyncKey.trim()}
                  className="btn-primary disabled:opacity-40 text-xs shrink-0"
                >
                  Pair & Pull
                </button>
              </div>

              {pairSuccess && (
                <div className="p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-in fade-in"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
                  <Check className="w-3.5 h-3.5" />
                  <span>Devices successfully paired! Data synced.</span>
                </div>
              )}
            </form>
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
                  style={{ background: 'rgba(180,83,9,0.1)', color: 'var(--accent)', border: '1px solid rgba(180,83,9,0.2)' }}>
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
