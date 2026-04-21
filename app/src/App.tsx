import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@allsetlabs/reusable/components/ui/sonner';
import { InitializeReusableChunks } from '@allsetlabs/reusable/initializeReusableChunks';
import { ChatList } from './pages/ChatList';
import { ChatView } from './pages/ChatView';
import { SchedulerList } from './pages/SchedulerList';
import { SchedulerView } from './pages/SchedulerView';
import { InteractiveChatList } from './pages/InteractiveChatList';
import { InteractiveChatView } from './pages/InteractiveChatView';
import { EventsTimer } from './pages/EventsTimer';
import { PlansPage } from './pages/PlansPage';
import { BabyLogs } from '@devbot/plugin-baby-logs/frontend/pages/BabyLogs';
import { BabyAnalytics } from '@devbot/plugin-baby-logs/frontend/pages/BabyAnalytics';
import { GrowthCharts } from '@devbot/plugin-baby-logs/frontend/pages/GrowthCharts';
import { LogsPage } from './pages/LogsPage';
import { LawnCare } from '@devbot/plugin-lawn-care/frontend/pages/LawnCare';
import { LawnPhotoJournal } from '@devbot/plugin-lawn-care/frontend/pages/LawnPhotoJournal';
import { RemotionVideos } from './pages/RemotionVideos';
import { WorkingDirectories } from './pages/WorkingDirectories';
import { CompanyList } from './pages/CompanyList';
import { CompanyView } from './pages/CompanyView';
import { SettingsPage } from './pages/SettingsPage';
import { Dashboard } from './pages/Dashboard';
import { PinnedMessagesPage } from './pages/PinnedMessagesPage';
import { TextSelectionProvider } from './components/TextSelectionProvider';
import { AppLayout } from './components/AppLayout';

function App() {
  return (
    <InitializeReusableChunks applyToBody defaultMuted>
      <div className="overflow-hidden bg-background">
        <TextSelectionProvider>
          <AppLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pinned" element={<PinnedMessagesPage />} />
              <Route path="/chats" element={<InteractiveChatList />} />
              <Route path="/chat/:chatId" element={<InteractiveChatView />} />
              <Route path="/scheduler" element={<SchedulerList />} />
              <Route path="/scheduler/:taskId" element={<SchedulerView />} />
              <Route path="/events-timer" element={<EventsTimer />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/baby-logs" element={<BabyLogs />} />
              <Route path="/baby-logs/analytics" element={<BabyAnalytics />} />
              <Route path="/baby-logs/growth" element={<GrowthCharts />} />
              <Route path="/lawn-care" element={<LawnCare />} />
              <Route path="/lawn-care/photos" element={<LawnPhotoJournal />} />
              <Route path="/videos" element={<RemotionVideos />} />
              <Route path="/working-directories" element={<WorkingDirectories />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/companies" element={<CompanyList />} />
              <Route path="/company/:companyId" element={<CompanyView />} />
              {/* Legacy CLI routes */}
              <Route path="/cli" element={<ChatList />} />
              <Route path="/cli/:sessionId" element={<ChatView />} />
              {/* Default and catch-all redirect to chat */}
              <Route path="/" element={<Navigate to="/chats" replace />} />
              <Route path="*" element={<Navigate to="/chats" replace />} />
            </Routes>
          </AppLayout>
        </TextSelectionProvider>
      </div>
      <Toaster position="bottom-center" />
    </InitializeReusableChunks>
  );
}

export { App };
