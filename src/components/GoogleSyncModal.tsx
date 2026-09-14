import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleAuthService } from '../services/googleAuth';
import { StorageService } from '../services/storage';
import { 
  X, 
  Cloud, 
  Smartphone, 
  Globe, 
  Calendar, 
  Check, 
  Download, 
  Upload, 
  Key,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Copy,
  RefreshCw,
  Share2
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

  const [customClientId, setCustomClientId] = useState(GoogleAuthService.getClientId());
  const [isSavedClientId, setIsSavedClientId] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'devicesync' | 'account' | 'android' | 'backup'>('devicesync');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  // Pre-load Google Identity Services script and auto-fetch backend Client ID
  useEffect(() => {
    if (isSyncModalOpen) {
      GoogleAuthService.loadGoogleScript().catch(err => {
        console.warn('Preloading Google Identity Services script:', err);
      });
      GoogleAuthService.fetchBackendConfig().then(id => {
        if (id) setCustomClientId(id);
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

  const handleSaveClientId = () => {
    Haptics.tap();
    GoogleAuthService.setClientId(customClientId.trim());
    setIsSavedClientId(true);
    setErrorMessage(null);
    setTimeout(() => setIsSavedClientId(false), 2500);
  };

  const handleGoogleRealSignIn = async () => {
    setErrorMessage(null);
    let clientId = customClientId.trim() || GoogleAuthService.getClientId();
    if (!clientId) {
      clientId = await GoogleAuthService.fetchBackendConfig();
      if (clientId) setCustomClientId(clientId);
    }
    if (!clientId) {
      setErrorMessage(
        'Google OAuth Client ID is missing. Add it to your Vercel Environment Variables (GOOGLE_CLIENT_ID) or paste it in the field below. You can also click "Connect Demo (Instant)"!'
      );
      return;
    }

    setIsAuthenticating(true);
    try {
      await GoogleAuthService.initGoogleTokenClient(
        (token, userPartial) => {
          setIsAuthenticating(false);
          updateProfile({
            ...userPartial,
            googleConnected: true,
            googleAccessToken: token,
            googleCalendarSyncEnabled: true
          });
        },
        (err) => {
          setIsAuthenticating(false);
          setErrorMessage(err?.message || 'Google OAuth Sign-in failed. Check your client ID and origin settings.');
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
    a.download = `studypulse-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="glass-panel w-full sm:max-w-lg max-sm:rounded-t-3xl sm:rounded-2xl border border-slate-300 dark:border-slate-700/80 shadow-2xl p-6 space-y-5 max-sm:max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle Pill */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-400/30 rounded-full mx-auto mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-200/50 dark:border-ocean-900/50 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-ocean-500/10 text-ocean-500 dark:text-aqua-400 border border-ocean-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Cross-Device Sync</h2>
              <p className="text-xs text-ocean-700/80 dark:text-ocean-300/70">Synchronize study schedules across Phone and Web</p>
            </div>
          </div>

          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-ocean-500/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub tabs */}
        <div className="flex space-x-1 p-1 rounded-xl bg-slate-200/70 dark:bg-abyss-900/80 border border-ocean-300/30 dark:border-ocean-900/60 text-xs">
          <button
            onClick={() => {
              Haptics.tap();
              setActiveSubTab('devicesync');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'devicesync' ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Device Sync
          </button>
          <button
            onClick={() => {
              Haptics.tap();
              setActiveSubTab('account');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'account' ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => {
              Haptics.tap();
              setActiveSubTab('android');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'android' ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => {
              Haptics.tap();
              setActiveSubTab('backup');
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'backup' ? 'bg-gradient-to-r from-ocean-600 to-aqua-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Backup
          </button>
        </div>

        {/* Inline error / notice alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start space-x-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{errorMessage}</p>
              {!GoogleAuthService.getClientId() && (
                <button
                  onClick={handleDemoSignIn}
                  className="font-bold text-ocean-600 dark:text-aqua-300 underline block pt-0.5"
                >
                  👉 Click here to use the 1-Click Demo Account instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 0: Universal Device Sync */}
        {activeSubTab === 'devicesync' && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="p-4 rounded-2xl bg-ocean-500/10 dark:bg-ocean-950/40 border border-ocean-300/40 dark:border-ocean-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Your Device Sync Key
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-slate-400'}`} />
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {cloudSyncStatus === 'syncing' ? 'Syncing...' : cloudSyncStatus === 'synced' ? 'Synced' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Sync Key Display */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-abyss-card border border-ocean-200 dark:border-ocean-800">
                <span className="font-mono text-base font-black text-ocean-700 dark:text-aqua-300 tracking-wider flex-1 select-all px-2">
                  {syncKey}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-lg bg-ocean-500/10 hover:bg-ocean-500/20 text-ocean-600 dark:text-aqua-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  {lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Real-time sync active'}
                </span>
                <button
                  onClick={async () => {
                    Haptics.tap();
                    await syncWithCloudNow();
                  }}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="px-3 py-1.5 rounded-xl liquid-btn text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>

            {/* Pair with Phone or another Browser */}
            <form onSubmit={handlePairDevice} className="p-4 rounded-2xl bg-slate-100/70 dark:bg-abyss-900/60 border border-ocean-200/40 dark:border-ocean-900/60 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-aqua-400" />
                  Pair Another Device
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  To sync with your phone, open StudyPulse on your phone, enter this key — or enter your phone's key below to link them.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. PULSE-ABCD12"
                  value={inputSyncKey}
                  onChange={(e) => setInputSyncKey(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-abyss-card border border-ocean-200 dark:border-ocean-800 text-xs font-mono uppercase text-slate-800 dark:text-slate-200 focus:outline-none focus:border-aqua-400"
                />
                <button
                  type="submit"
                  disabled={!inputSyncKey.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-ocean-600 to-aqua-500 hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold transition-all shrink-0"
                >
                  Pair & Pull
                </button>
              </div>

              {pairSuccess && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Devices successfully paired! Data synced.</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Tab 1: Google Account & Calendar */}
        {activeSubTab === 'account' && (
          <div className="space-y-4">
            {profile.googleConnected ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center space-x-3">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {profile.name}
                      </h4>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700"
                  >
                    Disconnect
                  </button>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Auto-Schedule to Google Calendar
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.googleCalendarSyncEnabled}
                    onChange={e => updateProfile({ googleCalendarSyncEnabled: e.target.checked })}
                    className="w-4 h-4 accent-ocean-600 rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-abyss-900/60 border border-ocean-200/40 dark:border-ocean-900/60 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-ocean-500/10 text-ocean-600 dark:text-aqua-400 flex items-center justify-center mx-auto border border-ocean-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">Connect Google Account</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Sync tasks across devices, and auto-schedule study sessions directly into Google Calendar.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                  <button
                    onClick={handleDemoSignIn}
                    className="px-4 py-2 rounded-xl liquid-btn text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Connect Demo (Instant)</span>
                  </button>
                  <button
                    onClick={handleGoogleRealSignIn}
                    disabled={isAuthenticating}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <span>{isAuthenticating ? 'Connecting...' : 'Google OAuth Sign-In'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Backend Auto-Configuration & Google Client ID */}
            <div className="p-3.5 rounded-xl bg-ocean-500/5 dark:bg-abyss-900/70 border border-ocean-200/50 dark:border-ocean-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-3.5 h-3.5 text-ocean-500 dark:text-aqua-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Backend OAuth Integration
                  </span>
                </div>
                {Boolean(customClientId) ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-Configured
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="text-[11px] text-ocean-600 dark:text-aqua-400 hover:underline flex items-center space-x-1 font-bold"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>{showSetupGuide ? 'Hide Guide' : 'How to get?'}</span>
                  </button>
                )}
              </div>

              {Boolean(customClientId) && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5 font-medium">
                  <span>🌊 Client ID loaded from backend (Vercel / .env). Users do not need to enter it!</span>
                </div>
              )}

              {showSetupGuide && (
                <div className="p-3 rounded-lg bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-900 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-300">Quick 2-minute setup in Google Cloud Console:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Go to <strong className="text-slate-800 dark:text-slate-200">console.cloud.google.com</strong></li>
                    <li>Create or select a project &gt; Enable <strong>Google Calendar API</strong>.</li>
                    <li>Under <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.</li>
                    <li>Application type: <strong>Web application</strong>.</li>
                    <li>Add Authorized JavaScript origins: <code className="text-ocean-600 dark:text-aqua-300 bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">http://localhost:5173</code> (and your Vercel domain).</li>
                    <li>Set <code className="text-ocean-600 dark:text-aqua-300 font-mono">GOOGLE_CLIENT_ID</code> in Vercel Environment Variables — no client typing required!</li>
                  </ol>
                </div>
              )}

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. 12345-abcde.apps.googleusercontent.com"
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-abyss-950 border border-ocean-200 dark:border-ocean-800 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-ocean-500"
                />
                <button
                  onClick={handleSaveClientId}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center space-x-1"
                >
                  {isSavedClientId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : null}
                  <span>{isSavedClientId ? 'Saved' : 'Save ID'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Note: All scheduled study tasks also generate 1-click Google Calendar web links to add events straight to your calendar!
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Android App Setup */}
        {activeSubTab === 'android' && (
          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3.5 rounded-xl bg-ocean-500/10 border border-ocean-500/20 flex items-start space-x-3">
              <Smartphone className="w-5 h-5 text-ocean-600 dark:text-aqua-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-100 block mb-1">Dual Android Deployment:</strong>
                StudyPulse is ready to install as an Android Progressive Web App (PWA) and can also be compiled to a native Android APK via Capacitor.
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                <span>Method 1: Direct Android Install (PWA)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">Recommended</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1 leading-relaxed">
                <li>Open this app in Chrome on your Android phone.</li>
                <li>Tap the three dots menu (⋮) in Chrome.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>The app launches standalone with no browser address bar and full offline support.</li>
              </ol>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-slate-200">
                Method 2: Native Android Studio APK (Capacitor)
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-abyss-950 font-mono text-[11px] text-ocean-600 dark:text-aqua-300 space-y-1">
                <div>npx cap add android</div>
                <div>npm run build</div>
                <div>npx cap sync</div>
                <div>npx cap open android</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Backup & Restore */}
        {activeSubTab === 'backup' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transfer your subjects, topics, and completed sessions between devices anytime with one-click JSON backup.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="p-4 rounded-xl bg-slate-100 dark:bg-abyss-900/80 hover:bg-ocean-500/10 dark:hover:bg-ocean-950/50 border border-ocean-200/40 dark:border-ocean-900/60 text-center space-y-2 transition-colors group"
              >
                <Download className="w-6 h-6 text-ocean-600 dark:text-aqua-400 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Backup</div>
                <div className="text-[11px] text-slate-400">Download .json data</div>
              </button>

              <label className="p-4 rounded-xl bg-slate-100 dark:bg-abyss-900/80 hover:bg-ocean-500/10 dark:hover:bg-ocean-950/50 border border-ocean-200/40 dark:border-ocean-900/60 text-center space-y-2 transition-colors cursor-pointer group">
                <Upload className="w-6 h-6 text-emerald-500 mx-auto group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Import Backup</div>
                <div className="text-[11px] text-slate-400">Restore from .json file</div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
