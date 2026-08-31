import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@allsetlabs/forge/components/ui/sonner';
import { InitializeForgeChunks } from '@allsetlabs/forge/initializeForgeChunks';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { routeList } from './routes';
import { pluginRoutes } from './pluginRoutes';
import { ChatList } from './pages/ChatList';
import { ChatView } from './pages/ChatView';
import { SchedulerView } from './pages/SchedulerView';
import { InteractiveChatView } from './pages/InteractiveChatView';
import { CompanyView } from './pages/CompanyView';
import { OcrView } from './pages/OcrView';
import { UnifiedChatList } from './pages/UnifiedChatList';
import { ProviderSessionView } from './pages/ProviderSessionView';
import { TextSelectionProvider } from './components/TextSelectionProvider';
import { AppLayout } from './components/AppLayout';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

/** Gate that renders children only when authenticated, otherwise shows login. */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return <>{children}</>;
}

function App() {
  return (
    <InitializeForgeChunks applyToBody defaultMuted>
      <AuthGate>
      <div className="overflow-hidden bg-background">
        <TextSelectionProvider>
          <AppLayout>
            <Routes>
              {/* Top-level routes — single source of truth in routes.tsx */}
              {routeList.map((r) => (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <RouteErrorBoundary>
                      <r.Component />
                    </RouteErrorBoundary>
                  }
                />
              ))}

              {/* Detail/param routes — these own their own header */}
              <Route path="/chat/:chatId" element={<RouteErrorBoundary><InteractiveChatView /></RouteErrorBoundary>} />
              <Route path="/scheduler/:taskId" element={<RouteErrorBoundary><SchedulerView /></RouteErrorBoundary>} />
              <Route path="/company/:companyId" element={<RouteErrorBoundary><CompanyView /></RouteErrorBoundary>} />
              <Route path="/ocr/:docId" element={<RouteErrorBoundary><OcrView /></RouteErrorBoundary>} />

              {/* Plugin sub-routes — single source of truth in pluginRoutes.tsx.
                  Each is a full-page load; the shared header shows "Plugins › <name>". */}
              {pluginRoutes.map((r) => (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <RouteErrorBoundary>
                      <r.Component />
                    </RouteErrorBoundary>
                  }
                />
              ))}

              {/* Legacy direct plugin routes → redirect to the canonical /plugins/* paths */}
              <Route path="/baby-logs" element={<Navigate to="/plugins/baby-logs" replace />} />
              <Route path="/baby-logs/analytics" element={<Navigate to="/plugins/baby-logs/analytics" replace />} />
              <Route path="/baby-logs/growth" element={<Navigate to="/plugins/baby-logs/growth" replace />} />
              <Route path="/family-hierarchy" element={<Navigate to="/plugins/family-hierarchy" replace />} />
              <Route path="/lawn-care" element={<Navigate to="/plugins/lawn-care" replace />} />
              <Route path="/lawn-care/photos" element={<Navigate to="/plugins/lawn-care/photos" replace />} />

              {/* Unified Chat / CLI Dashboard detail routes */}
              <Route path="/unified/dir/:encoded" element={<RouteErrorBoundary><UnifiedChatList /></RouteErrorBoundary>} />
              <Route path="/unified/session/:provider/:sessionId" element={<RouteErrorBoundary><ProviderSessionView /></RouteErrorBoundary>} />

              {/* Legacy CLI routes */}
              <Route path="/cli" element={<RouteErrorBoundary><ChatList /></RouteErrorBoundary>} />
              <Route path="/cli/:sessionId" element={<RouteErrorBoundary><ChatView /></RouteErrorBoundary>} />

              {/* Default and catch-all redirect to chat */}
              <Route path="/" element={<Navigate to="/chats" replace />} />
              <Route path="*" element={<Navigate to="/chats" replace />} />
            </Routes>
          </AppLayout>
        </TextSelectionProvider>
      </div>
      </AuthGate>
      <Toaster position="bottom-center" />
    </InitializeForgeChunks>
  );
}

export { App };
