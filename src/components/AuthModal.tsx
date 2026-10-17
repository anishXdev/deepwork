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
    // Check if this is the first sign in
    const isFirstTime = !localStorage.getItem('dstudy_has_authenticated');
    if (isFirstTime) {
      // Clean slate: no fake tasks, no fake streaks for a new user
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

    // Automatically trigger interactive walkthrough for first-timers
    const hasCompletedTour = localStorage.getItem('dstudy_interactive_tour_completed');
    if (isFirstTime || !hasCompletedTour) {
      setTimeout(() => {
        setIsTourOpen(true);
      }, 400);
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
          // If error was due to missing client ID, explain clearly
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-3xl border border-teal-500/35 bg-[#030a12]/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 flex flex-col text-center relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-teal-500/20 via-cyan-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Close Button (allows skipping if user wants to inspect UI) */}
        <button
          onClick={() => {
            Haptics.tap();
            setStudyMode(selectedGatePrep, settings.gateTargetStream || 'CSE');
            setIsAuthModalOpen(false);
          }}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Continue without signing in"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center justify-center mt-1 mb-4">
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 mb-2.5 shadow-lg shadow-teal-500/15">
            <DStudyLogo size={38} showText={false} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
            <span>Sign In / Sign Up</span>
          </h2>
          <p className="text-xs text-teal-300/80 mt-0.5 max-w-xs leading-relaxed">
            Minimalist Focus, Curriculum Planning & Deep Work Flow
          </p>
        </div>

        {/* Study Mode Selector: Simple Mode vs GATE Prep Mode */}
        <div className="mb-4 text-left">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-teal-300/90 font-bold mb-1.5 text-center">
            Choose Your Workspace Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                Haptics.tap();
                setSelectedGatePrep(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                !selectedGatePrep
                  ? 'bg-teal-500/20 border-teal-400 text-white shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <BookOpen className={`w-4 h-4 ${!selectedGatePrep ? 'text-teal-400' : 'text-slate-500'}`} />
                <span className="text-xs font-extrabold">Simple Study</span>
              </div>
              <p className="text-[10px] opacity-80 leading-snug">
                Clean general planner, custom subjects & exam countdown
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                Haptics.tap();
                setSelectedGatePrep(true);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedGatePrep
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <GraduationCap className={`w-4 h-4 ${selectedGatePrep ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="text-xs font-extrabold">GATE Exam Prep</span>
              </div>
              <p className="text-[10px] opacity-80 leading-snug">
                GATE syllabus weightages, PYQ drills & 3h CBT mock timer
              </p>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Primary Action: Google Sign In Button */}
        <div className="space-y-2.5 my-1">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center justify-center space-x-3 shadow-xl shadow-white/10 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Official Google G SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Secondary Fast Action: Guest / 1-Click Access */}
          <button
            onClick={handleGuestSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>Continue as Guest ({selectedGatePrep ? 'GATE Mode' : 'Simple Mode'})</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-4 pt-3.5 border-t border-teal-500/20 grid grid-cols-3 gap-2 text-left">
          <div className="p-2 rounded-xl bg-slate-900/60 border border-teal-500/20">
            <Cloud className="w-4 h-4 text-teal-400 mb-1" />
            <span className="block text-[11px] font-bold text-white leading-tight">Instant Cloud Sync</span>
            <span className="text-[9px] text-slate-400 leading-tight">Cross web & mobile</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-teal-500/20">
            <Lock className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="block text-[11px] font-bold text-white leading-tight">Strict Focus</span>
            <span className="text-[9px] text-slate-400 leading-tight">Distraction lockdown</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-teal-500/20">
            <Flame className="w-4 h-4 text-amber-400 mb-1" />
            <span className="block text-[11px] font-bold text-white leading-tight">365d Heatmap</span>
            <span className="text-[9px] text-slate-400 leading-tight">Annual consistency</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-3">
          You can switch between Simple Study and GATE Prep mode or set your Exam Date anytime from the dashboard.
        </p>
      </div>
    </div>
  );
};
