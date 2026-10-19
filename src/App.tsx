import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { TodayTomorrowView } from './components/TodayTomorrowView';
import { TagsManager } from './components/TagsManager';
import { PomodoroTimer } from './components/PomodoroTimer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ExcalidrawWhiteboard } from './components/ExcalidrawWhiteboard';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TopicModal } from './components/TopicModal';
import { RescheduleModal } from './components/RescheduleModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
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

const MainContent: React.FC = () => {
  const { activeTab, isStreakModalOpen, closeStreakModal } = useApp();

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100 transition-colors" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <div className="flex-1">
          {activeTab === 'study' && <TodayTomorrowView />}
          {(activeTab === 'tags' || activeTab === 'subjects') && <TagsManager />}
          {activeTab === 'timer' && <PomodoroTimer />}
          {activeTab === 'whiteboard' && <ExcalidrawWhiteboard />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>

        {/* Global Floating Action Button for Mobile */}
        <MobileFab />

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />

        {/* Global Modals */}
        <TopicModal />
        <RescheduleModal />
        <GoogleSyncModal />
        <CreateSubjectModal />
        <AuthModal />
        <InteractiveTourCoach />
        <TaskCelebrationOverlay />
        <StreakModal isOpen={isStreakModalOpen} onClose={closeStreakModal} />
        <StrictFocusOverlay />
        <KeyboardShortcutsModal />
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
