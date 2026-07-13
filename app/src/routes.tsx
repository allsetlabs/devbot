import type { ComponentType, ReactNode } from 'react';
import {
  LayoutDashboard,
  MessageCircle,
  Pin,
  Clock,
  Timer,
  Lightbulb,
  Blocks,
  Video,
  FolderOpen,
  Building2,
  ScanLine,
  ScrollText,
  Settings,
  Archive,
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { InteractiveChatList } from './pages/InteractiveChatList';
import { PinnedMessagesPage } from './pages/PinnedMessagesPage';
import { SchedulerList } from './pages/SchedulerList';
import { EventsTimer } from './pages/EventsTimer';
import { PlansPage } from './pages/PlansPage';
import { PluginsHub } from './pages/PluginsHub';
import { RemotionVideos } from './pages/RemotionVideos';
import { WorkingDirectories } from './pages/WorkingDirectories';
import { CompanyList } from './pages/CompanyList';
import { OcrList } from './pages/OcrList';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ArchivedChatsPage } from './pages/ArchivedChatsPage';

/**
 * Single source of truth for top-level app routes. Drives, all from one object:
 *   - the `<Route>` list in App.tsx
 *   - the slide-out nav menu in SlideNav.tsx (entries where `nav !== false`)
 *   - the shared top bar's icon + name in Header.tsx
 *
 * Per-route header *actions* are NOT declared here — each page owns its buttons and
 * portals them into the shared bar's right-aligned slot via <HeaderSlot> (see
 * components/HeaderSlot.tsx). That keeps action state colocated with the page, no
 * provider needed. This object only carries the always-present parts (icon + name).
 *
 * Detail/param routes (/chat/:id, /scheduler/:id, …) and plugin sub-routes keep their
 * own headers and are declared directly in App.tsx — they are intentionally absent here.
 */
export interface AppRoute {
  /** Route path, e.g. '/dashboard'. */
  path: string;
  /** Display name — shown in the nav menu and the shared header title. */
  name: string;
  /** Icon element (color inherited from context; no color baked in). */
  icon: ReactNode;
  /** Page component rendered for this route. */
  Component: ComponentType;
  /** Show in the slide-out nav menu. Defaults to true; set false for reachable-but-unlisted routes. */
  nav?: boolean;
}

export const routes = {
  dashboard: {
    path: '/dashboard',
    name: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    Component: Dashboard,
  },
  chats: {
    path: '/chats',
    name: 'Chat',
    icon: <MessageCircle className="h-5 w-5" />,
    Component: InteractiveChatList,
  },
  pinned: {
    path: '/pinned',
    name: 'Pinned',
    icon: <Pin className="h-5 w-5" />,
    Component: PinnedMessagesPage,
  },
  scheduler: {
    path: '/scheduler',
    name: 'Scheduler',
    icon: <Clock className="h-5 w-5" />,
    Component: SchedulerList,
  },
  eventsTimer: {
    path: '/events-timer',
    name: 'Events Timer',
    icon: <Timer className="h-5 w-5" />,
    Component: EventsTimer,
  },
  plans: {
    path: '/plans',
    name: 'Plans',
    icon: <Lightbulb className="h-5 w-5" />,
    Component: PlansPage,
  },
  plugins: {
    path: '/plugins',
    name: 'Plugins',
    icon: <Blocks className="h-5 w-5" />,
    Component: PluginsHub,
  },
  videos: {
    path: '/videos',
    name: 'Videos',
    icon: <Video className="h-5 w-5" />,
    Component: RemotionVideos,
  },
  workingDirectories: {
    path: '/working-directories',
    name: 'Directories',
    icon: <FolderOpen className="h-5 w-5" />,
    Component: WorkingDirectories,
  },
  companies: {
    path: '/companies',
    name: 'Companies',
    icon: <Building2 className="h-5 w-5" />,
    Component: CompanyList,
  },
  ocr: {
    path: '/ocr',
    name: 'OCR',
    icon: <ScanLine className="h-5 w-5" />,
    Component: OcrList,
  },
  logs: {
    path: '/logs',
    name: 'Logs',
    icon: <ScrollText className="h-5 w-5" />,
    Component: LogsPage,
  },
  settings: {
    path: '/settings',
    name: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    Component: SettingsPage,
  },
  archived: {
    path: '/archived',
    name: 'Archived',
    icon: <Archive className="h-5 w-5" />,
    Component: ArchivedChatsPage,
    nav: false,
  },
} satisfies Record<string, AppRoute>;

/** Ordered list of routes, for mapping in App.tsx / SlideNav. */
export const routeList: AppRoute[] = Object.values(routes);

/** Find the config route (if any) that owns the shared top bar for a pathname. */
export function findRoute(pathname: string): AppRoute | undefined {
  return routeList.find((r) => r.path === pathname);
}
