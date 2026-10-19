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
import { McpModal } from './components/McpModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { TeamCollaborationRoom } from './components/TeamCollaborationRoom';
import { IncomingCallModal } from './components/IncomingCallModal';
import { TopicModal } from './components/TopicModal';
import { RescheduleModal } from './components/RescheduleModal';
import { CreateSubjectModal } from './components/CreateSubjectModal';
import { StreakModal } from './components/StreakModal';
import { AuthModal } from './components/AuthModal';
import { InteractiveTourCoach } from './components/InteractiveTourCoach';
import { TaskCelebrationOverlay } from './components/TaskCelebrationOverlay';
import { StrictFocusOverlay } from './components/StrictFocusOverlay';
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
    <main className="min-h-screen text-slate-900 dark:text-slate-100 transition-colors" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="min-h-screen flex flex-col">
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
        <InteractiveTourCoach />
        <TaskCelebrationOverlay />
        <StreakModal isOpen={isStreakModalOpen} onClose={closeStreakModal} />
        <StrictFocusOverlay />
        <KeyboardShortcutsModal />
        <TemplatesModal />
        <McpModal />
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
