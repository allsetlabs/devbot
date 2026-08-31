import { RotateCcw, RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Slider } from '@allsetlabs/forge/components/ui/slider';
import { Switch } from '@allsetlabs/forge/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@allsetlabs/forge/components/ui/select';
import type {
  HierarchyDirection,
  HierarchyAlgorithm,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';
import type { GraphSettings, ConnectorStyle } from '../lib/useGraphSettings';

interface Props {
  settings: GraphSettings;
  onChange: <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void;
  onReset: () => void;
  onRelayout: () => void;
  onClose: () => void;
}

/**
 * Floating panel (bottom-right) to tune the graph layout. Opened / closed from the header's
 * layout button; its values persist to localStorage via `useGraphSettings`.
 */
export function LayoutPanel({ settings, onChange, onReset, onRelayout, onClose }: Props) {
  return (
    <div className="absolute bottom-4 right-4 z-40 w-64 overflow-hidden rounded-xl border border-primary/40 bg-card/90 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Layout
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReset} aria-label="Reset to defaults">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Close layout panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-t border-border px-3 py-3">
        <Row label="react flow">
          <div className="flex justify-end">
            <Switch
              checked={settings.renderer === 'flow'}
              onCheckedChange={(v) => onChange('renderer', v ? 'flow' : 'hierarchy')}
              aria-label="Render with React Flow"
            />
          </div>
        </Row>

        {/* Both renderers honour these — the flow view lays out via forge's shared engine, so
            algorithm / direction / connector / gaps / center-on-select all apply there too. */}
        <Row label="direction">
          <Select value={settings.direction} onValueChange={(v) => onChange('direction', v as HierarchyDirection)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark">
              <SelectItem value="down">down</SelectItem>
              <SelectItem value="right">right</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="algorithm">
          <Select value={settings.algorithm} onValueChange={(v) => onChange('algorithm', v as HierarchyAlgorithm)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark">
              <SelectItem value="elk-left">elk (left)</SelectItem>
              <SelectItem value="tidy">tidy</SelectItem>
              <SelectItem value="elk">elk (raw)</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="connector">
          <Select value={settings.connector} onValueChange={(v) => onChange('connector', v as ConnectorStyle)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark">
              <SelectItem value="elbow">curved (step)</SelectItem>
              <SelectItem value="smooth">flowy (curve)</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <SliderRow label="width" value={settings.treeWidth} min={2} max={160} onChange={(v) => onChange('treeWidth', v)} />
        <SliderRow
          label="height"
          value={settings.treeHeight}
          min={2}
          max={160}
          onChange={(v) => onChange('treeHeight', v)}
        />

        <Row label="center on select">
          <div className="flex justify-end">
            <Switch checked={settings.centerOnSelect} onCheckedChange={(v) => onChange('centerOnSelect', v)} />
          </div>
        </Row>

        <Button variant="default" size="sm" className="w-full" onClick={onRelayout}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Force relayout
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <Slider
        className="min-w-0 flex-1"
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0])}
      />
      <span className="w-8 shrink-0 text-right tabular-nums text-foreground">{value}</span>
    </div>
  );
}
