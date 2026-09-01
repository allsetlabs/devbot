import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@allsetlabs/forge/components/ui/card';
import {
  ArrowLeft,
  RefreshCw,
  Brain,
  Camera,
  MapPin,
  Clock,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CameraRecord, AnalysisResult } from '../types';
import { babyMonitorApi } from '../api';

interface Props {
  camera: CameraRecord;
  onBack: () => void;
  onUpdate: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  safe: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  unknown: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function CameraDetailView({ camera, onBack, onUpdate }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [snapshotKey, setSnapshotKey] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(false);

  const handleCapture = useCallback(async () => {
    setCapturing(true);
    try {
      await babyMonitorApi.captureSnapshot(camera.id);
      setSnapshotKey(Date.now());
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setCapturing(false);
    }
  }, [camera.id, onUpdate]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await babyMonitorApi.analyzeCamera(camera.id);
      setLastResult(result);
      setSnapshotKey(Date.now());
      onUpdate();
      if (result.analysis.safe) {
        toast.success(result.analysis.summary);
      } else {
        toast.warning(result.analysis.summary);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleCapture();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, handleCapture]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{camera.name}</h2>
          {camera.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {camera.location}
            </p>
          )}
        </div>
        <Badge className={STATUS_COLORS[camera.safetyStatus] || STATUS_COLORS.unknown}>
          {camera.safetyStatus}
        </Badge>
      </div>

      {/* Large snapshot display */}
      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-lg bg-black">
            {camera.lastSnapshot ? (
              <img
                key={snapshotKey}
                src={`${babyMonitorApi.getSnapshotUrl(camera.id)}&k=${snapshotKey}`}
                alt={`${camera.name} live view`}
                className="w-full object-contain"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-white/50">
                <div className="text-center">
                  <Camera className="mx-auto mb-2 h-12 w-12" />
                  <p>No snapshot available</p>
                  <p className="text-sm">Capture one to get started</p>
                </div>
              </div>
            )}
            {autoRefresh && (
              <div className="absolute right-2 top-2">
                <Badge variant="outline" className="border-white/20 bg-black/60 text-white">
                  <Activity className="mr-1 h-3 w-3 animate-pulse text-red-400" />
                  LIVE
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleCapture}
          disabled={capturing}
          className="flex-1"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${capturing ? 'animate-spin' : ''}`} />
          {capturing ? 'Capturing…' : 'Capture Snapshot'}
        </Button>
        <Button
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzing || !camera.lastSnapshot}
          className="flex-1"
        >
          <Brain className={`mr-2 h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
          {analyzing ? 'Analyzing…' : 'Run Analysis'}
        </Button>
        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
        </Button>
      </div>

      {/* Analysis Result */}
      {lastResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Latest Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    lastResult.analysis.safe
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  }
                >
                  {lastResult.analysis.safe ? 'Safe' : 'Concern Detected'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Confidence: {Math.round(lastResult.analysis.confidence * 100)}%
                </span>
              </div>
              <p className="text-sm">{lastResult.analysis.summary}</p>
              {lastResult.analysis.details && (
                <p className="text-xs text-muted-foreground">{lastResult.analysis.details}</p>
              )}
              {lastResult.analysis.observations.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {lastResult.analysis.observations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Camera Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Stream URL</span>
            <span className="truncate font-mono text-xs">{camera.rtspUrl}</span>
            <span className="text-muted-foreground">Transport</span>
            <span className="uppercase">{camera.transport}</span>
            <span className="text-muted-foreground">Check Interval</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {camera.analysisInterval}s
            </span>
            <span className="text-muted-foreground">Status</span>
            <span>{camera.enabled ? '✅ Enabled' : '⏸️ Disabled'}</span>
            <span className="text-muted-foreground">Last Snapshot</span>
            <span>
              {camera.lastSnapshot
                ? new Date(camera.lastSnapshot).toLocaleString()
                : 'Never'}
            </span>
            <span className="text-muted-foreground">Last Analysis</span>
            <span>
              {camera.lastAnalysis
                ? new Date(camera.lastAnalysis).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
