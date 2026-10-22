import React, { Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { TodayTomorrowView } from './components/TodayTomorrowView';

// Lazy-load secondary tabs to make initial page load instantaneous
const TagsManager = React.lazy(() => import('./components/TagsManager').then(m => ({ default: m.TagsManager })));
const PomodoroTimer = React.lazy(() => import('./components/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const ExcalidrawWhiteboard = React.lazy(() => import('./components/ExcalidrawWhiteboard').then(m => ({ default: m.ExcalidrawWhiteboard })));
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { TeamCollaborationRoom } from './components/TeamCollaborationRoom';
import { IncomingCallModal } from './components/IncomingCallModal';
import { TopicModal } from './components/TopicModal';
import { RescheduleModal } from './components/RescheduleModal';
import { CreateSubjectModal } from './components/CreateSubjectModal';
import { StreakModal } from './components/StreakModal';
import { AuthModal } from './components/AuthModal';
import { TaskCelebrationOverlay } from './components/TaskCelebrationOverlay';
import { ToastContainer } from './components/ToastContainer';
import { MobileFab } from './components/MobileFab';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';

const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[300px] text-xs font-semibold text-slate-400">
    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
    Loading...
  </div>
);

const MainContent: React.FC = () => {
  const { activeTab, isStreakModalOpen, closeStreakModal } = useApp();

  return (
    <main className="relative isolate min-h-screen text-slate-900 dark:text-slate-100 transition-colors" style={{ backgroundColor: '#000000' }}>
      <div className="night-sky" aria-hidden="true">
        <div className="sky-sun sky-sun-main" />
        <div className="twinkling-stars">
          {Array.from({ length: 8 }, (_, index) => <span className={`twinkle-star twinkle-star-${index + 1}`} key={index} />)}
        </div>
        <div className="sky-birds">
          {Array.from({ length: 5 }, (_, index) => (
            <svg className={`sky-bird sky-bird-${index + 1}`} viewBox="0 0 54 20" key={index}>
              <path className="bird-wing bird-wing-left" d="M22 15 Q13 4 1 3 Q12 10 22 20Z" />
              <path className="bird-wing bird-wing-right" d="M22 15 Q31 4 43 3 Q32 10 22 20Z" />
              <path className="bird-body" d="M18 14 Q22 11 26 14 L30 19 L22 17 L16 19Z" />
              <path className="bird-flame" d="M39 9 Q48 2 45 8 Q50 6 46 12 Q43 15 39 12Z" />
            </svg>
          ))}
        </div>
      </div>
      <div className="relative z-[1] min-h-screen flex flex-col">
        <Navbar />

        <div className="flex-1">
          {activeTab === 'study' && <TodayTomorrowView />}
          <Suspense fallback={<ViewLoadingFallback />}>
            {(activeTab === 'tags' || activeTab === 'subjects') && <TagsManager />}
            {activeTab === 'timer' && <PomodoroTimer />}
            {activeTab === 'whiteboard' && <ExcalidrawWhiteboard />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
          </Suspense>
        </div>

        {/* Global Floating Action Button for Mobile */}
        <MobileFab />

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />

        {/* Global Modals */}
        <TopicModal />
        <RescheduleModal />
        <CreateSubjectModal />
        <AuthModal />
        <TaskCelebrationOverlay />
        <StreakModal isOpen={isStreakModalOpen} onClose={closeStreakModal} />
        <KeyboardShortcutsModal />
        <TemplatesModal />
        <NotificationCenterModal />
        <TeamCollaborationRoom />
        <IncomingCallModal />
        <ToastContainer />
      </div>
    </main>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
