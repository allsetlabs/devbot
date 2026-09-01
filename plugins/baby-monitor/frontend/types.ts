/** Baby Monitor Plugin — shared types. */

export type SafetyStatus = 'safe' | 'warning' | 'danger' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface CameraRecord {
  id: string;
  name: string;
  rtspUrl: string;
  location: string;
  enabled: boolean;
  lastSnapshot: string;
  lastAnalysis: string;
  lastAnalysisResult: string;
  safetyStatus: SafetyStatus;
  analysisInterval: number;
  transport: 'tcp' | 'udp';
  username: string;
  password: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface AlertRecord {
  id: string;
  cameraId: string;
  cameraName: string;
  severity: AlertSeverity;
  message: string;
  details: string;
  snapshotPath: string;
  acknowledged: boolean;
  confidence: number;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface MonitoringStatus {
  running: boolean;
  startedAt: string | null;
  lastCheck: string | null;
  checksCount: number;
  alertsCount: number;
  ffmpegAvailable: boolean;
}

export interface SystemCheck {
  ffmpeg: boolean;
  ollama: boolean;
  ollamaModels: string[];
  llavaAvailable: boolean;
}

export interface MonitorStats {
  totalCameras: number;
  enabledCameras: number;
  totalAlerts: number;
  unacknowledgedAlerts: number;
  dangerAlerts: number;
  monitoringActive: boolean;
  snapshotDiskUsageMB: number;
  safetyBreakdown: {
    safe: number;
    warning: number;
    danger: number;
    unknown: number;
  };
}

export interface AnalysisResult {
  ok: boolean;
  analysis: {
    safe: boolean;
    severity: AlertSeverity;
    confidence: number;
    summary: string;
    details: string;
    observations: string[];
  };
  safetyStatus: SafetyStatus;
}
