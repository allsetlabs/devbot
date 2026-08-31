import { useCallback, useEffect, useState } from 'react';
import type {
  HierarchyDirection,
  HierarchyAlgorithm,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';

/**
 * User's preferred graph layout, persisted to localStorage. Restored on first render (the
 * `useState` initialiser below runs before the graph mounts) so the tree comes up in the
 * layout the user last chose. The LayoutPanel edits these live.
 */
export type ConnectorStyle = 'elbow' | 'smooth';
export type Renderer = 'hierarchy' | 'flow'; // read-only view engine: the tuned hierarchy graph, or ReactFlow
export type Language = 'ta' | 'en'; // which single name a node shows in the read-only view (Tamil / English)

export interface GraphSettings {
  treeWidth: number; // horizontal gap between nodes (hGap)
  treeHeight: number; // vertical gap between generations (vGap)
  direction: HierarchyDirection;
  algorithm: HierarchyAlgorithm;
  connector: ConnectorStyle;
  centerOnSelect: boolean; // on node select, straighten + center the lineage (vs. just highlight)
  renderer: Renderer; // opt into the ReactFlow read-only view from the Layout panel
  language: Language; // read-only view shows one name per node; header toggles it (edit mode always shows both)
}

// Bumped to v3 when the renderer + language toggles landed: discards stale values so the new
// fields fall back to their defaults, then persists from there.
const KEY = 'family-hierarchy:graph-settings:v3';

export const DEFAULT_SETTINGS: GraphSettings = {
  treeWidth: 15,
  treeHeight: 20,
  direction: 'down',
  algorithm: 'elk-left',
  connector: 'elbow',
  centerOnSelect: true,
  renderer: 'hierarchy',
  language: 'ta',
};

export function useGraphSettings() {
  const [settings, setSettings] = useState<GraphSettings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GraphSettings>) };
    } catch {
      /* ignore malformed storage */
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota / disabled storage */
    }
  }, [settings]);

  const update = useCallback(<K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, update, reset };
}
