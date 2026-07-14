import { useCallback, useEffect, useState } from 'react';
import type {
  HierarchyDirection,
  HierarchyAlgorithm,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';

/**
 * TEMPORARY dev tuning for the graph layout, persisted to localStorage so values survive
 * reloads while we dial in the spacing. Remove this (and the GraphDevPanel) once the tree
 * width / height gaps are confirmed and baked into the page defaults.
 */
export type ConnectorStyle = 'elbow' | 'smooth';

export interface GraphSettings {
  treeWidth: number; // horizontal gap between nodes (hGap)
  treeHeight: number; // vertical gap between generations (vGap)
  direction: HierarchyDirection;
  algorithm: HierarchyAlgorithm;
  connector: ConnectorStyle;
  centerOnSelect: boolean; // on node select, straighten + center the lineage (vs. just highlight)
}

const KEY = 'family-hierarchy:graph-settings';

export const DEFAULT_SETTINGS: GraphSettings = {
  treeWidth: 16,
  treeHeight: 22,
  direction: 'down',
  algorithm: 'tidy',
  connector: 'elbow',
  centerOnSelect: true,
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
