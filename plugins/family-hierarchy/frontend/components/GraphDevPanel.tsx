import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, RefreshCw } from 'lucide-react';
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
}

/** TEMPORARY floating panel to tune the graph layout live (persisted to localStorage). */
export function GraphDevPanel({ settings, onChange, onReset, onRelayout }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-30 w-64 overflow-hidden rounded-xl border border-primary/40 bg-card/90 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Layout · dev
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReset} aria-label="Reset to defaults">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <Row label="algorithm">
            <Select value={settings.algorithm} onValueChange={(v) => onChange('algorithm', v as HierarchyAlgorithm)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="tidy">tidy</SelectItem>
                <SelectItem value="elk">elk (raw)</SelectItem>
                <SelectItem value="elk-left">elk (left)</SelectItem>
              </SelectContent>
            </Select>
          </Row>

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

          <SliderRow
            label="treeWidth"
            value={settings.treeWidth}
            min={2}
            max={160}
            onChange={(v) => onChange('treeWidth', v)}
          />
          <SliderRow
            label="treeHeight"
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
      )}
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
