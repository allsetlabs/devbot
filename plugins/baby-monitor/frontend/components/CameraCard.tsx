import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@allsetlabs/forge/components/ui/card';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Camera,
  RefreshCw,
  Brain,
  Trash2,
  MapPin,
  Power,
  PowerOff,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CameraRecord } from '../types';
import { babyMonitorApi } from '../api';

interface Props {
  camera: CameraRecord;
  onUpdate: () => void;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  safe: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  unknown: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

function timeAgo(iso: string): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CameraCard({ camera, onUpdate, onClick }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleCapture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCapturing(true);
    try {
      await babyMonitorApi.captureSnapshot(camera.id);
      toast.success('Snapshot captured');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzing(true);
    try {
      const result = await babyMonitorApi.analyzeCamera(camera.id);
      if (result.analysis.safe) {
        toast.success(result.analysis.summary);
      } else {
        toast.warning(result.analysis.summary);
      }
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await babyMonitorApi.updateCamera(camera.id, { enabled: !camera.enabled });
      onUpdate();
    } catch {
      toast.error('Failed to toggle camera');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await babyMonitorApi.deleteCamera(camera.id);
      toast.success('Camera removed');
      onUpdate();
    } catch {
      toast.error('Failed to delete camera');
    }
  };

  return (
    <Card
      className={`group cursor-pointer transition-all md:hover:-translate-y-0.5 md:hover:shadow-md ${
        !camera.enabled ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">{camera.name}</CardTitle>
              {camera.location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {camera.location}
                </p>
              )}
            </div>
          </div>
          <Badge className={STATUS_COLORS[camera.safetyStatus] || STATUS_COLORS.unknown}>
            {camera.safetyStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Snapshot preview */}
        <div className="mb-3 overflow-hidden rounded-lg bg-muted">
          {camera.lastSnapshot ? (
            <img
              src={babyMonitorApi.getSnapshotUrl(camera.id)}
              alt={`${camera.name} snapshot`}
              className="h-40 w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Camera className="mx-auto mb-1 h-8 w-8 opacity-40" />
                <p className="text-xs">No snapshot yet</p>
              </div>
            </div>
          )}
        </div>

        {camera.lastAnalysisResult && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
            {camera.lastAnalysisResult}
          </p>
        )}

        <div className="mb-3 flex gap-3 text-[11px] text-muted-foreground">
          <span>📸 {timeAgo(camera.lastSnapshot)}</span>
          <span>🧠 {timeAgo(camera.lastAnalysis)}</span>
        </div>

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCapture} disabled={capturing} className="flex-1 text-xs">
            <RefreshCw className={`mr-1 h-3 w-3 ${capturing ? 'animate-spin' : ''}`} />
            {capturing ? '…' : 'Snap'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing || !camera.lastSnapshot} className="flex-1 text-xs">
            <Brain className={`mr-1 h-3 w-3 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? '…' : 'Analyze'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggle} className="px-2" title={camera.enabled ? 'Disable' : 'Enable'}>
            {camera.enabled ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="px-2 text-destructive md:hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
