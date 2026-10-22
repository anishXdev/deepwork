import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleAuthService } from '../services/googleAuth';
import { StorageService } from '../services/storage';
import {
  X,
  Cloud,
  Loader2,
  User,
  Shield,
  Zap,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    profile,
    setProfile,
    setIsTourOpen,
    resetWorkspaceToCleanSlate,
    signOut
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isAuthModalOpen) return null;

  const isSignedIn = Boolean(profile.googleConnected || profile.email);

  const handleSuccessfulSignIn = (newProfile: any) => {
    const isFirstTime = !localStorage.getItem('deepwork_has_authenticated') && !localStorage.getItem('dstudy_has_authenticated');
    if (isFirstTime) {
      localStorage.setItem('deepwork_has_authenticated', 'true');
    }

    // Register this user in the registered users directory
    StorageService.registerUser(newProfile);

    // Clean slate: ensure 0 dummy data, 0 dummy cards, 0 dummy tags, and 0 dummy members
    resetWorkspaceToCleanSlate(newProfile);

    setIsLoading(false);
    setIsAuthModalOpen(false);
    Haptics.success();
    Notifications.toast('success', `Welcome to Deepwork, ${newProfile.name || 'Member'}!`);

    const hasCompletedTour = localStorage.getItem('deepwork_interactive_tour_completed') || localStorage.getItem('dstudy_interactive_tour_completed');
    if (isFirstTime || !hasCompletedTour) {
      setTimeout(() => { setIsTourOpen(true); }, 400);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    Haptics.tap();

    try {
      await GoogleAuthService.initGoogleTokenClient(
        (token, userProfile) => {
          handleSuccessfulSignIn({
            ...profile,
            ...userProfile,
            id: profile.id || 'usr_' + Date.now(),
            googleConnected: true,
            googleCalendarSyncEnabled: true,
            googleAccessToken: token,
            authProvider: 'google',
            emailVerified: true,
            schemaVersion: 2
          });
        },
        (err) => {
          console.warn('Google Sign-In failed or was cancelled:', err);
          setIsLoading(false);
          if (err.message?.includes('Google Client ID is not configured')) {
            setErrorMessage('Google Client ID is not configured on this host. You can use Quick Guest Sign-In below to explore all features instantly!');
          } else {
            setErrorMessage(err.message || 'Google sign-in was cancelled or encountered a network error.');
          }
          Haptics.warning();
        }
      );
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage(e.message || 'Could not initiate Google authentication.');
      Haptics.warning();
    }
  };

  const handleGuestSignIn = () => {
    Haptics.tap();
    const guestProfile = {
      ...profile,
      id: profile.id || 'guest_' + Date.now(),
      name: 'Deepwork Member',
      email: 'member@deepwork.local',
      googleConnected: false,
      googleCalendarSyncEnabled: false,
      authProvider: 'guest' as const,
      schemaVersion: 2
    };
    handleSuccessfulSignIn(guestProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-sm rounded-2xl p-6 sm:p-7 flex flex-col text-center relative"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            Haptics.tap();
            setIsAuthModalOpen(false);
          }}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center justify-center mt-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md tracking-tighter mb-3">
            dw
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isSignedIn ? 'Your Account' : 'Sign In to Deepwork'}
          </h2>
          <p className="text-xs mt-1 max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {isSignedIn ? 'Manage your profile, cloud sync, and active session' : 'Minimal workspace for deep focus & real-time collaboration'}
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            className="mb-4 p-3 rounded-xl text-xs text-left leading-relaxed"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#b45309' }}
          >
            {errorMessage}
          </div>
        )}

        {/* Signed In View with Sign Out Button */}
        {isSignedIn ? (
          <div className="space-y-4 my-2">
            <div
              className="p-3.5 rounded-xl border flex items-center gap-3 text-left"
              style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm overflow-hidden ring-2 ring-blue-500/20">
                {profile.avatarUrl || profile.avatar ? (
                  <img src={profile.avatarUrl || profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{profile.email || 'Guest User'}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                  <span>Schema v2 • Cloud Synced</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={signOut}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 btn-secondary cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Switch / Sign in with Another Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Auth Buttons */
          <div className="space-y-2.5 my-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <button
              onClick={handleGuestSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}
            >
              <User className="w-3.5 h-3.5" />
              <span>Continue as Guest</span>
            </button>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-5 pt-4 grid grid-cols-3 gap-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Cloud className="w-3.5 h-3.5 mx-auto mb-1 text-blue-500" />
            <span className="block text-[10px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Cloud Sync</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Multi-device</span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Zap className="w-3.5 h-3.5 mx-auto mb-1 text-amber-500" />
            <span className="block text-[10px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Flow State</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Timer & whiteboard</span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-500" />
            <span className="block text-[10px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>E2EE Teams</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Chat & calling</span>
          </div>
        </div>
      </div>
    </div>
  );
};
