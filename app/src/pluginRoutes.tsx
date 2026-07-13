import type { ComponentType, ReactNode } from 'react';
import { Baby, Leaf, Network } from 'lucide-react';
import { BabyLogs } from '@devbot/plugin-baby-logs/frontend/pages/BabyLogs';
import { BabyAnalytics } from '@devbot/plugin-baby-logs/frontend/pages/BabyAnalytics';
import { GrowthCharts } from '@devbot/plugin-baby-logs/frontend/pages/GrowthCharts';
import { LawnCare } from '@devbot/plugin-lawn-care/frontend/pages/LawnCare';
import { LawnPhotoJournal } from '@devbot/plugin-lawn-care/frontend/pages/LawnPhotoJournal';
import { FamilyHierarchy } from '@devbot/plugin-family-hierarchy/frontend/pages/FamilyHierarchy';

/**
 * Registry of every plugin sub-route, namespaced under `/plugins`. This is the plugin
 * analog of routes.tsx — one object that drives:
 *   - the `<Route>` list in App.tsx (each is a full-page load under the shared layout)
 *   - the shared header's breadcrumb: `Plugins › <name>` (see Header.tsx)
 *
 * To add a plugin page, add one entry here and register nothing else — App.tsx and the
 * header pick it up automatically. `name` is the breadcrumb leaf shown after "Plugins ›".
 */
export interface PluginRoute {
  /** Canonical path, always namespaced under /plugins. */
  path: string;
  /** Breadcrumb leaf — rendered as "Plugins › <name>". */
  name: string;
  /** Icon for the plugin (used in the PluginsHub cards / plugin context). */
  icon: ReactNode;
  /** Page component (full-page load). */
  Component: ComponentType;
}

export const pluginRoutes: PluginRoute[] = [
  {
    path: '/plugins/baby-logs',
    name: 'Baby Logs',
    icon: <Baby className="h-5 w-5" />,
    Component: BabyLogs,
  },
  {
    path: '/plugins/baby-logs/analytics',
    name: 'Baby Analytics',
    icon: <Baby className="h-5 w-5" />,
    Component: BabyAnalytics,
  },
  {
    path: '/plugins/baby-logs/growth',
    name: 'Growth Charts',
    icon: <Baby className="h-5 w-5" />,
    Component: GrowthCharts,
  },
  {
    path: '/plugins/lawn-care',
    name: 'Lawn Care',
    icon: <Leaf className="h-5 w-5" />,
    Component: LawnCare,
  },
  {
    path: '/plugins/lawn-care/photos',
    name: 'Photo Journal',
    icon: <Leaf className="h-5 w-5" />,
    Component: LawnPhotoJournal,
  },
  {
    path: '/plugins/family-hierarchy',
    name: 'Family Hierarchy',
    icon: <Network className="h-5 w-5" />,
    Component: FamilyHierarchy,
  },
];

/** Find the plugin route that owns the shared breadcrumb bar for a pathname. */
export function findPluginRoute(pathname: string): PluginRoute | undefined {
  return pluginRoutes.find((r) => r.path === pathname);
}
