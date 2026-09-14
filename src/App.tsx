import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { TodayTomorrowView } from './components/TodayTomorrowView';
import { SubjectManager } from './components/SubjectManager';
import { PomodoroTimer } from './components/PomodoroTimer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TopicModal } from './components/TopicModal';
import { RescheduleModal } from './components/RescheduleModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { CreateSubjectModal } from './components/CreateSubjectModal';
import { StreakModal } from './components/StreakModal';
import { MobileFab } from './components/MobileFab';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainContent: React.FC = () => {
  const { activeTab, isStreakModalOpen, closeStreakModal } = useApp();

  return (
    <main className="min-h-screen relative text-slate-900 dark:text-slate-100 selection:bg-ocean-500/30 selection:text-ocean-700 dark:selection:text-aqua-200 transition-colors">
      {/* 3D Dynamic Water Caustics & Liquid Glow Background */}
      <div className="water-caustic-bg" aria-hidden="true" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />

        <div className="flex-1 pt-2 pb-28 sm:pb-16">
          {activeTab === 'study' && <TodayTomorrowView />}
          {activeTab === 'subjects' && <SubjectManager />}
          {activeTab === 'timer' && <PomodoroTimer />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>

        {/* Global Floating Action Button for Mobile */}
        <MobileFab />

        {/* Global Modals */}
        <TopicModal />
        <RescheduleModal />
        <GoogleSyncModal />
        <CreateSubjectModal />
        <StreakModal isOpen={isStreakModalOpen} onClose={closeStreakModal} />
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
