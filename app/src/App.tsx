import { Routes, Route, Navigate } from 'react-router-dom';
import { InitializeReusableChunks } from '@subbiah/reusable/initializeReusableChunks';
import { ChatList } from './pages/ChatList';
import { ChatView } from './pages/ChatView';
import { SchedulerList } from './pages/SchedulerList';
import { SchedulerView } from './pages/SchedulerView';
import { InteractiveChatList } from './pages/InteractiveChatList';
import { InteractiveChatView } from './pages/InteractiveChatView';
import { EventsTimer } from './pages/EventsTimer';
import { PlansPage } from './pages/PlansPage';
import { BabyLogs, BabyAnalytics, GrowthCharts } from '@devbot/plugin-baby-logs/frontend';
import { LogsPage } from './pages/LogsPage';
import { LawnCare, LawnPhotoJournal } from '@devbot/plugin-lawn-care/frontend';
import { RemotionVideos } from './pages/RemotionVideos';
import { TextSelectionProvider } from './components/TextSelectionProvider';

function App() {
  return (
    <InitializeReusableChunks applyToBody defaultMuted>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <TextSelectionProvider>
          <Routes>
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
            <Route path="/logs" element={<LogsPage />} />
            {/* Legacy CLI routes */}
            <Route path="/cli" element={<ChatList />} />
            <Route path="/cli/:sessionId" element={<ChatView />} />
            {/* Default and catch-all redirect to chat */}
            <Route path="/" element={<Navigate to="/chats" replace />} />
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
        </TextSelectionProvider>
      </div>
    </InitializeReusableChunks>
  );
}

export default App;
