import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GoogleAuthService } from '../services/googleAuth';
import { StorageService, getGateStarterSubjects, getSimpleStarterSubjects } from '../services/storage';
import { DStudyLogo } from './DStudyLogo';
import {
  X,
  Cloud,
  Loader2,
  User,
  Flame,
  Lock,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    profile,
    setProfile,
    setSubjects,
    setTopics,
    setSessions,
    setStreaks,
    settings,
    setStudyMode,
    setIsTourOpen
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedGatePrep, setSelectedGatePrep] = useState<boolean>(Boolean(settings.isGatePrep));

  if (!isAuthModalOpen) return null;

  const handleSuccessfulSignIn = (newProfile: any) => {
    const isFirstTime = !localStorage.getItem('dstudy_has_authenticated');
    if (isFirstTime) {
      StorageService.resetToCleanSlate(selectedGatePrep);
      setSubjects(selectedGatePrep ? getGateStarterSubjects('CSE') : getSimpleStarterSubjects());
      setTopics([]);
      setSessions([]);
      setStreaks({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        activityHistory: {}
      });
      localStorage.setItem('dstudy_has_authenticated', 'true');
    }

    setStudyMode(selectedGatePrep, settings.gateTargetStream || 'CSE');
    setProfile(newProfile);
    StorageService.saveProfile(newProfile);
    setIsLoading(false);
    setIsAuthModalOpen(false);
    Haptics.success();
    Notifications.toast('success', `Welcome to dstudy, ${newProfile.name || 'Scholar'}!`);

    const hasCompletedTour = localStorage.getItem('dstudy_interactive_tour_completed');
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
            googleAccessToken: token
          });
        },
        (err) => {
          console.warn('Google Sign-In failed or was cancelled:', err);
          setIsLoading(false);
          if (err.message?.includes('Google Client ID is not configured')) {
            setErrorMessage('Google Client ID is not configured on this host. You can use Quick Guest Sign-In below to explore all features with a fresh account!');
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
      name: selectedGatePrep ? 'GATE Aspirant' : 'Focus Scholar',
      email: 'scholar@dstudy.app',
      googleConnected: false,
      googleCalendarSyncEnabled: false
    };
    handleSuccessfulSignIn(guestProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 sm:p-7 flex flex-col text-center relative"
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
            setStudyMode(selectedGatePrep, settings.gateTargetStream || 'CSE');
            setIsAuthModalOpen(false);
          }}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}
          title="Continue without signing in"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center justify-center mt-1 mb-5">
          <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(180,83,9,0.1)', border: '1px solid rgba(180,83,9,0.2)' }}>
            <DStudyLogo size={36} showText={false} />
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}>
            Sign In / Sign Up
          </h2>
          <p className="text-xs mt-1 max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Minimalist Focus, Curriculum Planning & Deep Work Flow
          </p>
        </div>

        {/* Study Mode Selector */}
        <div className="mb-5 text-left">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-center mb-2" style={{ color: 'var(--text-muted)' }}>
            Choose Your Workspace Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { Haptics.tap(); setSelectedGatePrep(false); }}
              className="p-3 rounded-xl border text-left transition-all cursor-pointer"
              style={{
                background: !selectedGatePrep ? 'rgba(180,83,9,0.08)' : 'var(--bg-card-alt)',
                border: !selectedGatePrep ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-4 h-4" style={{ color: !selectedGatePrep ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-xs font-bold">Simple Study</span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                Clean general planner, custom subjects & exam countdown
              </p>
            </button>

            <button
              type="button"
              onClick={() => { Haptics.tap(); setSelectedGatePrep(true); }}
              className="p-3 rounded-xl border text-left transition-all cursor-pointer"
              style={{
                background: selectedGatePrep ? 'rgba(180,83,9,0.08)' : 'var(--bg-card-alt)',
                border: selectedGatePrep ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-4 h-4" style={{ color: selectedGatePrep ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-xs font-bold">GATE Exam Prep</span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                GATE syllabus weightages, PYQ drills & 3h CBT mock timer
              </p>
            </button>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl text-xs text-left leading-relaxed"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#b45309' }}>
            {errorMessage}
          </div>
        )}

        {/* Auth Buttons */}
        <div className="space-y-2.5 my-1">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
            style={{ border: '1px solid #e2e8f0' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            style={{ background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.25)', color: 'var(--accent)' }}
          >
            <User className="w-4 h-4" />
            <span>Continue as Guest ({selectedGatePrep ? 'GATE Mode' : 'Simple Mode'})</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="mt-5 pt-4 grid grid-cols-3 gap-2 text-left" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Cloud className="w-4 h-4 mb-1" style={{ color: 'var(--accent)' }} />
            <span className="block text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Cloud Sync</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Cross web & mobile</span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Lock className="w-4 h-4 mb-1" style={{ color: 'var(--accent)' }} />
            <span className="block text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Strict Focus</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Distraction lockdown</span>
          </div>

          <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            <Flame className="w-4 h-4 mb-1" style={{ color: 'var(--accent)' }} />
            <span className="block text-[11px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>365d Heatmap</span>
            <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>Annual consistency</span>
          </div>
        </div>

        <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
          You can switch between Simple Study and GATE Prep mode or set your Exam Date anytime from the dashboard.
        </p>
      </div>
    </div>
  );
};
