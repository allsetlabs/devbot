/**
 * Baby Monitor Store — file-based backend for RTSP camera monitoring + AI safety inference.
 *
 * Uses FileStore for cameras and alerts. ffmpeg for RTSP snapshots. Ollama for vision inference.
 * All processing is local-only — no cloud APIs.
 */

import path from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { execSync, exec } from 'child_process';
import { Router } from 'express';
import { FileStore } from '../../../backend/src/lib/file-store.js';
import { createFileStoreRouter } from '../../../backend/src/lib/file-store-router.js';
import type { FileStoreRecord } from '../../../backend/src/lib/file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../../../backend/src/lib/env.js';

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface CameraRecord extends FileStoreRecord {
  name: string;
  /** RTSP URL, e.g. rtsp://192.168.1.100:554/stream */
  rtspUrl: string;
  /** Friendly location label, e.g. "Nursery", "Bedroom" */
  location: string;
  /** Whether this camera is enabled for monitoring */
  enabled: boolean;
  /** Last successful snapshot timestamp (ISO) */
  lastSnapshot: string;
  /** Last analysis timestamp (ISO) */
  lastAnalysis: string;
  /** Last analysis result summary */
  lastAnalysisResult: string;
  /** Safety status from last analysis */
  safetyStatus: 'safe' | 'warning' | 'danger' | 'unknown';
  /** Analysis interval in seconds (default 60) */
  analysisInterval: number;
  /** RTSP transport: tcp or udp */
  transport: 'tcp' | 'udp';
  /** Optional username for RTSP auth */
  username: string;
  /** Optional password for RTSP auth */
  password: string;
}

export interface AlertRecord extends FileStoreRecord {
  cameraId: string;
  cameraName: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  details: string;
  /** Snapshot file path at time of alert */
  snapshotPath: string;
  /** Whether the user has acknowledged this alert */
  acknowledged: boolean;
  /** Analysis confidence 0-1 */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Data dirs
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');
const SNAPSHOTS_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'baby-monitor', 'snapshots');

if (!existsSync(SNAPSHOTS_DIR)) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Store instances
// ---------------------------------------------------------------------------

export const cameraStore = new FileStore<CameraRecord>({
  filePath: path.join(DATA_DIR, 'baby-monitor-cameras.json'),
  name: 'baby-monitor-cameras',
  autoCommit: false,
  commitPrefix: 'data',
});

export const alertStore = new FileStore<AlertRecord>({
  filePath: path.join(DATA_DIR, 'baby-monitor-alerts.json'),
  name: 'baby-monitor-alerts',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// RTSP Snapshot Service
// ---------------------------------------------------------------------------

function isFfmpegAvailable(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function captureSnapshot(camera: CameraRecord): Promise<string> {
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${camera.id}.jpg`);

  let rtspUrl = camera.rtspUrl;
  if (camera.username && camera.password) {
    const url = new URL(rtspUrl.replace('rtsp://', 'http://'));
    url.username = camera.username;
    url.password = camera.password;
    rtspUrl = url.toString().replace('http://', 'rtsp://');
  }

  const transport = camera.transport || 'tcp';

  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -rtsp_transport ${transport} -i "${rtspUrl}" -frames:v 1 -q:v 2 "${snapshotFile}" 2>/dev/null`;
    exec(cmd, { timeout: 15000 }, (error) => {
      if (error) {
        reject(new Error(`Failed to capture snapshot: ${error.message}`));
        return;
      }
      if (!existsSync(snapshotFile)) {
        reject(new Error('Snapshot file was not created'));
        return;
      }
      resolve(snapshotFile);
    });
  });
}

async function captureFromUrl(url: string, cameraId: string): Promise<string> {
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${cameraId}.jpg`);
  return new Promise((resolve, reject) => {
    const cmd = `curl -sL -o "${snapshotFile}" "${url}"`;
    exec(cmd, { timeout: 10000 }, (error) => {
      if (error) {
        reject(new Error(`Failed to capture from URL: ${error.message}`));
        return;
      }
      resolve(snapshotFile);
    });
  });
}

// ---------------------------------------------------------------------------
// AI Safety Analyzer (Ollama Vision)
// ---------------------------------------------------------------------------

interface AnalysisResult {
  safe: boolean;
  severity: 'info' | 'warning' | 'danger';
  confidence: number;
  summary: string;
  details: string;
  observations: string[];
}

const SAFETY_PROMPT = `You are a baby safety monitor AI. Analyze this image from a baby monitor camera.

Look for these safety concerns:
1. Baby sleeping face-down (prone position) — DANGER
2. Loose blankets/pillows near baby's face — DANGER
3. Baby standing or climbing in crib — WARNING
4. Objects in crib that could be choking hazards — WARNING
5. Baby appears to be in distress or crying — WARNING
6. Crib bumpers or soft bedding — WARNING
7. Baby not visible or camera obscured — INFO

Respond ONLY in this exact JSON format (no other text):
{
  "safe": true/false,
  "severity": "info" | "warning" | "danger",
  "confidence": 0.0-1.0,
  "summary": "one-line summary",
  "details": "detailed explanation",
  "observations": ["observation 1", "observation 2"]
}

If no baby is visible or the image is unclear, set safe=true, severity="info".`;

async function analyzeSnapshot(snapshotPath: string): Promise<AnalysisResult> {
  const imageBuffer = readFileSync(snapshotPath);
  const base64Image = imageBuffer.toString('base64');

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        prompt: SAFETY_PROMPT,
        images: [base64Image],
        stream: false,
        options: { temperature: 0.1, num_predict: 500 },
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);

    const data = (await response.json()) as { response: string };

    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
      return {
        safe: result.safe ?? true,
        severity: ['info', 'warning', 'danger'].includes(result.severity) ? result.severity : 'info',
        confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
        summary: result.summary || 'Analysis complete',
        details: result.details || '',
        observations: Array.isArray(result.observations) ? result.observations : [],
      };
    } catch {
      return {
        safe: true, severity: 'info', confidence: 0.3,
        summary: 'Analysis inconclusive — could not parse AI response',
        details: data.response?.substring(0, 500) || 'No response',
        observations: ['AI response could not be parsed as structured data'],
      };
    }
  } catch (err) {
    return {
      safe: true, severity: 'info', confidence: 0,
      summary: 'Ollama not available — analysis skipped',
      details: `Error: ${err instanceof Error ? err.message : String(err)}`,
      observations: ['Ollama vision model (llava) is required for analysis', 'Run: ollama pull llava'],
    };
  }
}

// ---------------------------------------------------------------------------
// Monitoring Loop
// ---------------------------------------------------------------------------

interface MonitoringState {
  running: boolean;
  startedAt: string | null;
  interval: ReturnType<typeof setInterval> | null;
  lastCheck: string | null;
  checksCount: number;
  alertsCount: number;
}

const monitoringState: MonitoringState = {
  running: false, startedAt: null, interval: null,
  lastCheck: null, checksCount: 0, alertsCount: 0,
};

async function runMonitoringCycle(): Promise<void> {
  const cameras = await cameraStore.list();
  const enabledCameras = cameras.filter((c) => c.enabled);

  for (const camera of enabledCameras) {
    try {
      let snapshotPath: string;
      if (camera.rtspUrl.startsWith('http://') || camera.rtspUrl.startsWith('https://')) {
        snapshotPath = await captureFromUrl(camera.rtspUrl, camera.id);
      } else {
        snapshotPath = await captureSnapshot(camera);
      }

      await cameraStore.update(camera.id, { lastSnapshot: new Date().toISOString(), updated_by: 'monitor' });

      const analysis = await analyzeSnapshot(snapshotPath);
      const safetyStatus = analysis.safe ? 'safe' : analysis.severity === 'danger' ? 'danger' : 'warning';

      await cameraStore.update(camera.id, {
        lastAnalysis: new Date().toISOString(),
        lastAnalysisResult: analysis.summary,
        safetyStatus,
        updated_by: 'monitor',
      });

      if (!analysis.safe) {
        await alertStore.create({
          cameraId: camera.id, cameraName: camera.name, severity: analysis.severity,
          message: analysis.summary,
          details: analysis.details + '\n\nObservations:\n' + analysis.observations.map((o: string) => `• ${o}`).join('\n'),
          snapshotPath, acknowledged: false, confidence: analysis.confidence,
          created_by: 'monitor', updated_by: 'monitor', settings: {},
        } as Omit<AlertRecord, 'id' | 'created_at' | 'updated_at'>);
        monitoringState.alertsCount++;
      }

      monitoringState.checksCount++;
      monitoringState.lastCheck = new Date().toISOString();
    } catch (err) {
      console.error(`[baby-monitor] Error monitoring camera ${camera.name}:`, err);
    }
  }
}

function startMonitoring(intervalSeconds: number = 60): void {
  if (monitoringState.running) return;
  monitoringState.running = true;
  monitoringState.startedAt = new Date().toISOString();
  monitoringState.checksCount = 0;
  monitoringState.alertsCount = 0;
  runMonitoringCycle();
  monitoringState.interval = setInterval(runMonitoringCycle, intervalSeconds * 1000);
}

function stopMonitoring(): void {
  if (!monitoringState.running) return;
  if (monitoringState.interval) { clearInterval(monitoringState.interval); monitoringState.interval = null; }
  monitoringState.running = false;
}

// ---------------------------------------------------------------------------
// CRUD Routers
// ---------------------------------------------------------------------------

const cameraCrudRouter = createFileStoreRouter(cameraStore, {
  requiredFields: ['name', 'rtspUrl'],
  beforeCreate: (data) => ({
    ...data,
    location: data.location ?? '',
    enabled: data.enabled ?? true,
    lastSnapshot: '', lastAnalysis: '', lastAnalysisResult: '',
    safetyStatus: 'unknown',
    analysisInterval: data.analysisInterval ?? 60,
    transport: data.transport ?? 'tcp',
    username: data.username ?? '',
    password: data.password ?? '',
  }),
});

const alertCrudRouter = createFileStoreRouter(alertStore, { requiredFields: [] });

// ---------------------------------------------------------------------------
// Custom Routes
// ---------------------------------------------------------------------------

function customRoutes(): Router {
  const router = Router();

  router.post('/cameras/:id/snapshot', async (req, res) => {
    try {
      const camera = await cameraStore.get(req.params.id);
      if (!camera) { res.status(404).json({ error: 'Camera not found' }); return; }

      let snapshotPath: string;
      if (camera.rtspUrl.startsWith('http://') || camera.rtspUrl.startsWith('https://')) {
        snapshotPath = await captureFromUrl(camera.rtspUrl, camera.id);
      } else {
        if (!isFfmpegAvailable()) { res.status(500).json({ error: 'ffmpeg is not installed. Install with: brew install ffmpeg' }); return; }
        snapshotPath = await captureSnapshot(camera);
      }

      await cameraStore.update(camera.id, { lastSnapshot: new Date().toISOString(), updated_by: 'user' });
      res.json({ ok: true, path: snapshotPath, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: 'Snapshot capture failed', detail: String(err) });
    }
  });

  router.get('/cameras/:id/snapshot', async (req, res) => {
    try {
      const camera = await cameraStore.get(req.params.id);
      if (!camera) { res.status(404).json({ error: 'Camera not found' }); return; }

      const snapshotFile = path.join(SNAPSHOTS_DIR, `${camera.id}.jpg`);
      if (!existsSync(snapshotFile)) { res.status(404).json({ error: 'No snapshot available. Capture one first.' }); return; }

      const stat = statSync(snapshotFile);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Snapshot-Time', camera.lastSnapshot || 'unknown');
      res.send(readFileSync(snapshotFile));
    } catch (err) {
      res.status(500).json({ error: 'Failed to get snapshot', detail: String(err) });
    }
  });

  router.post('/cameras/:id/analyze', async (req, res) => {
    try {
      const camera = await cameraStore.get(req.params.id);
      if (!camera) { res.status(404).json({ error: 'Camera not found' }); return; }

      const snapshotFile = path.join(SNAPSHOTS_DIR, `${camera.id}.jpg`);
      if (!existsSync(snapshotFile)) { res.status(400).json({ error: 'No snapshot available. Capture one first.' }); return; }

      const analysis = await analyzeSnapshot(snapshotFile);
      const safetyStatus = analysis.safe ? 'safe' : analysis.severity === 'danger' ? 'danger' : 'warning';

      await cameraStore.update(camera.id, {
        lastAnalysis: new Date().toISOString(), lastAnalysisResult: analysis.summary,
        safetyStatus, updated_by: 'user',
      });

      if (!analysis.safe) {
        await alertStore.create({
          cameraId: camera.id, cameraName: camera.name, severity: analysis.severity,
          message: analysis.summary,
          details: analysis.details + '\n\nObservations:\n' + analysis.observations.map((o: string) => `• ${o}`).join('\n'),
          snapshotPath: snapshotFile, acknowledged: false, confidence: analysis.confidence,
          created_by: 'user', updated_by: 'user', settings: {},
        } as Omit<AlertRecord, 'id' | 'created_at' | 'updated_at'>);
      }

      res.json({ ok: true, analysis, safetyStatus });
    } catch (err) {
      res.status(500).json({ error: 'Analysis failed', detail: String(err) });
    }
  });

  router.post('/alerts/:id/acknowledge', async (req, res) => {
    try {
      const alert = await alertStore.get(req.params.id);
      if (!alert) { res.status(404).json({ error: 'Alert not found' }); return; }
      const updated = await alertStore.update(req.params.id, { acknowledged: true, updated_by: 'user' });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to acknowledge alert', detail: String(err) });
    }
  });

  router.post('/alerts/acknowledge-all', async (_req, res) => {
    try {
      const alerts = await alertStore.list();
      const unacknowledged = alerts.filter((a: AlertRecord) => !a.acknowledged);
      for (const alert of unacknowledged) {
        await alertStore.update(alert.id, { acknowledged: true, updated_by: 'user' });
      }
      res.json({ ok: true, acknowledged: unacknowledged.length });
    } catch (err) {
      res.status(500).json({ error: 'Failed to acknowledge alerts', detail: String(err) });
    }
  });

  router.post('/monitoring/start', async (req, res) => {
    const interval = req.body?.interval ?? 60;
    startMonitoring(interval);
    res.json({ ok: true, running: true, startedAt: monitoringState.startedAt, interval });
  });

  router.post('/monitoring/stop', async (_req, res) => {
    stopMonitoring();
    res.json({ ok: true, running: false, checksCount: monitoringState.checksCount, alertsCount: monitoringState.alertsCount });
  });

  router.get('/monitoring/status', async (_req, res) => {
    res.json({
      running: monitoringState.running, startedAt: monitoringState.startedAt,
      lastCheck: monitoringState.lastCheck, checksCount: monitoringState.checksCount,
      alertsCount: monitoringState.alertsCount, ffmpegAvailable: isFfmpegAvailable(),
    });
  });

  router.get('/stats', async (_req, res) => {
    try {
      const cameras = await cameraStore.list();
      const alerts = await alertStore.list();
      let snapshotSize = 0;
      if (existsSync(SNAPSHOTS_DIR)) {
        for (const f of readdirSync(SNAPSHOTS_DIR)) {
          try { snapshotSize += statSync(path.join(SNAPSHOTS_DIR, f)).size; } catch { /* skip */ }
        }
      }
      res.json({
        totalCameras: cameras.length,
        enabledCameras: cameras.filter((c: CameraRecord) => c.enabled).length,
        totalAlerts: alerts.length,
        unacknowledgedAlerts: alerts.filter((a: AlertRecord) => !a.acknowledged).length,
        dangerAlerts: alerts.filter((a: AlertRecord) => a.severity === 'danger').length,
        monitoringActive: monitoringState.running,
        snapshotDiskUsageMB: Math.round((snapshotSize / 1024 / 1024) * 100) / 100,
        safetyBreakdown: {
          safe: cameras.filter((c: CameraRecord) => c.safetyStatus === 'safe').length,
          warning: cameras.filter((c: CameraRecord) => c.safetyStatus === 'warning').length,
          danger: cameras.filter((c: CameraRecord) => c.safetyStatus === 'danger').length,
          unknown: cameras.filter((c: CameraRecord) => c.safetyStatus === 'unknown').length,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Stats failed', detail: String(err) });
    }
  });

  router.get('/system-check', async (_req, res) => {
    const checks = {
      ffmpeg: isFfmpegAvailable(), ollama: false,
      ollamaModels: [] as string[], llavaAvailable: false,
    };
    try {
      const resp = await fetch('http://localhost:11434/api/tags');
      if (resp.ok) {
        checks.ollama = true;
        const data = (await resp.json()) as { models: Array<{ name: string }> };
        checks.ollamaModels = data.models?.map((m: { name: string }) => m.name) || [];
        checks.llavaAvailable = checks.ollamaModels.some((m: string) => m.includes('llava'));
      }
    } catch { /* Ollama not running */ }
    res.json(checks);
  });

  return router;
}

// ---------------------------------------------------------------------------
// Combined router
// ---------------------------------------------------------------------------

export function getBabyMonitorRouter(): Router {
  const router = Router();
  router.use('/', customRoutes());
  router.use('/cameras', cameraCrudRouter);
  router.use('/alerts', alertCrudRouter);
  return router;
}
