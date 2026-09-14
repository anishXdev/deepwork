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

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200 transition-colors">
      <Navbar />

      <div className="pt-2">
        {activeTab === 'study' && <TodayTomorrowView />}
        {activeTab === 'subjects' && <SubjectManager />}
        {activeTab === 'timer' && <PomodoroTimer />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>

      {/* Global Modals */}
      <TopicModal />
      <RescheduleModal />
      <GoogleSyncModal />
      <CreateSubjectModal />
    </main>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
