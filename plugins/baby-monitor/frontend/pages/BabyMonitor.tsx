import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@allsetlabs/forge/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@allsetlabs/forge/components/ui/tabs';
import {
  Plus,
  Camera,
  AlertTriangle,
  Shield,
  Activity,
  Play,
  Square,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import type {
  CameraRecord,
  AlertRecord,
  MonitoringStatus,
  SystemCheck,
  MonitorStats,
} from '../types';
import { babyMonitorApi } from '../api';
import { CameraCard } from '../components/CameraCard';
import { CameraDetailView } from '../components/CameraDetailView';
import { AlertHistory } from '../components/AlertHistory';
import { AddCameraDrawer } from '../components/AddCameraDrawer';

export function BabyMonitor() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringStatus | null>(null);
  const [systemCheck, setSystemCheck] = useState<SystemCheck | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CameraRecord | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('cameras');

  const refresh = useCallback(async () => {
    try {
      const [cams, alts, mon, st] = await Promise.all([
        babyMonitorApi.listCameras(),
        babyMonitorApi.listAlerts(),
        babyMonitorApi.getMonitoringStatus(),
        babyMonitorApi.stats(),
      ]);
      setCameras(cams);
      setAlerts(
        alts.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
      setMonitoring(mon);
      setStats(st);
      // Update selected camera if viewing one
      if (selectedCamera) {
        const updated = cams.find((c) => c.id === selectedCamera.id);
        if (updated) setSelectedCamera(updated);
      }
    } catch (err) {
      console.error('[baby-monitor] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCamera]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleToggleMonitoring = async () => {
    try {
      if (monitoring?.running) {
        await babyMonitorApi.stopMonitoring();
        toast.success('Monitoring stopped');
      } else {
        await babyMonitorApi.startMonitoring();
        toast.success('Monitoring started');
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle monitoring');
    }
  };

  const handleLoadSystemCheck = useCallback(async () => {
    try {
      const check = await babyMonitorApi.systemCheck();
      setSystemCheck(check);
    } catch {
      toast.error('System check failed');
    }
  }, []);

  useEffect(() => {
    if (tab === 'system' && !systemCheck) {
      handleLoadSystemCheck();
    }
  }, [tab, systemCheck, handleLoadSystemCheck]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  // Camera detail view
  if (selectedCamera) {
    return (
      <div className="h-full overflow-auto">
        <div className="mx-auto w-full max-w-4xl p-4">
          <CameraDetailView
            camera={selectedCamera}
            onBack={() => setSelectedCamera(null)}
            onUpdate={refresh}
          />
        </div>
      </div>
    );
  }

  const unackAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex h-full flex-col">
      <HeaderSlot>
        <div className="flex items-center gap-2">
          <Button
            variant={monitoring?.running ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleMonitoring}
          >
            {monitoring?.running ? (
              <>
                <Square className="mr-1 h-3 w-3" /> Stop
              </>
            ) : (
              <>
                <Play className="mr-1 h-3 w-3" /> Monitor
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => setAddDrawerOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Camera
          </Button>
        </div>
      </HeaderSlot>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-4xl p-4">
          {/* Stats cards */}
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <Camera className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold">{stats.totalCameras}</p>
                  <p className="text-xs text-muted-foreground">Cameras</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Shield
                    className={`mx-auto mb-1 h-5 w-5 ${
                      stats.safetyBreakdown.danger > 0
                        ? 'text-red-500'
                        : 'text-emerald-500'
                    }`}
                  />
                  <p className="text-2xl font-bold">
                    {stats.safetyBreakdown.safe}/{stats.enabledCameras}
                  </p>
                  <p className="text-xs text-muted-foreground">Safe</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <AlertTriangle
                    className={`mx-auto mb-1 h-5 w-5 ${
                      unackAlerts > 0 ? 'text-amber-500' : 'text-muted-foreground'
                    }`}
                  />
                  <p className="text-2xl font-bold">{unackAlerts}</p>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Activity
                    className={`mx-auto mb-1 h-5 w-5 ${
                      monitoring?.running
                        ? 'animate-pulse text-emerald-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                  <p className="text-2xl font-bold">{monitoring?.checksCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Checks</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="cameras" className="flex-1">
                <Camera className="mr-1 h-3.5 w-3.5" />
                Cameras
                {cameras.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {cameras.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex-1">
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                Alerts
                {unackAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[10px]">
                    {unackAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="system" className="flex-1">
                <Cpu className="mr-1 h-3.5 w-3.5" />
                System
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cameras" className="mt-4">
              {cameras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Camera className="mb-3 h-12 w-12 opacity-40" />
                  <p className="text-sm font-medium">No cameras configured</p>
                  <p className="mb-4 text-xs">Add an RTSP camera to get started.</p>
                  <Button size="sm" onClick={() => setAddDrawerOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Camera
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cameras.map((cam) => (
                    <CameraCard
                      key={cam.id}
                      camera={cam}
                      onUpdate={refresh}
                      onClick={() => setSelectedCamera(cam)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-4">
              <AlertHistory alerts={alerts} onUpdate={refresh} />
            </TabsContent>

            <TabsContent value="system" className="mt-4 space-y-4">
              {/* System requirements */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">System Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  {systemCheck ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span className="text-sm">ffmpeg</span>
                        </div>
                        {systemCheck.ffmpeg ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Installed
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600">
                            <XCircle className="mr-1 h-3 w-3" /> Missing
                          </Badge>
                        )}
                      </div>
                      {!systemCheck.ffmpeg && (
                        <p className="text-xs text-muted-foreground">
                          Install with:{' '}
                          <code className="rounded bg-muted px-1">brew install ffmpeg</code>
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          <span className="text-sm">Ollama</span>
                        </div>
                        {systemCheck.ollama ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Running
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600">
                            <XCircle className="mr-1 h-3 w-3" /> Not Running
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          <span className="text-sm">LLaVA Model</span>
                        </div>
                        {systemCheck.llavaAvailable ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Available
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600">
                            <XCircle className="mr-1 h-3 w-3" /> Not Pulled
                          </Badge>
                        )}
                      </div>
                      {!systemCheck.llavaAvailable && systemCheck.ollama && (
                        <p className="text-xs text-muted-foreground">
                          Pull with:{' '}
                          <code className="rounded bg-muted px-1">ollama pull llava</code>
                        </p>
                      )}

                      {systemCheck.ollamaModels.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Available Models
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {systemCheck.ollamaModels.map((m) => (
                              <Badge key={m} variant="secondary" className="text-[10px]">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={handleLoadSystemCheck}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" /> Re-check
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleLoadSystemCheck}>
                      Run System Check
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Monitoring stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span>{monitoring?.running ? '🟢 Active' : '⚪ Stopped'}</span>
                    {monitoring?.startedAt && (
                      <>
                        <span className="text-muted-foreground">Started</span>
                        <span>{new Date(monitoring.startedAt).toLocaleString()}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Total Checks</span>
                    <span>{monitoring?.checksCount ?? 0}</span>
                    <span className="text-muted-foreground">Alerts Generated</span>
                    <span>{monitoring?.alertsCount ?? 0}</span>
                    {stats && (
                      <>
                        <span className="text-muted-foreground">Snapshot Disk</span>
                        <span>{stats.snapshotDiskUsageMB} MB</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">1.</span>
                      <span>Add RTSP cameras (or HTTP image URLs for testing)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">2.</span>
                      <span>ffmpeg captures periodic snapshots from each camera</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">3.</span>
                      <span>
                        Ollama LLaVA vision model analyzes each frame for safety
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">4.</span>
                      <span>
                        Alerts generated for unsafe positions (face-down, loose blankets,
                        etc.)
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-foreground">5.</span>
                      <span>
                        All processing is local — nothing leaves your machine
                      </span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AddCameraDrawer
        open={addDrawerOpen}
        onOpenChange={setAddDrawerOpen}
        onCreated={refresh}
      />
    </div>
  );
}
