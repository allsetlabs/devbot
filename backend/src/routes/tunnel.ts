/**
 * Cloudflare Tunnel management routes.
 *
 * Provides REST endpoints to start/stop the cloudflared tunnel process,
 * check status, view logs, and update configuration.
 */

import { Router } from 'express';
import { tunnel, CloudflareTunnel, type TunnelConfig } from '../lib/tunnel.js';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';
import { BACKEND_PORT } from '../lib/env.js';

export const tunnelRouter = Router();

// ── GET /api/tunnel/status ──────────────────────────────────────────────
// Returns current tunnel state (status, URL, metrics, cloudflared version).
tunnelRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const state = tunnel.getState();
    res.json({
      ...state,
      installed: CloudflareTunnel.isInstalled(),
      version: CloudflareTunnel.getVersion(),
    });
  }, 'tunnel:status')
);

// ── GET /api/tunnel/logs ────────────────────────────────────────────────
// Returns recent cloudflared log lines.
tunnelRouter.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = tunnel.getLogs(limit);
    res.json({ logs, count: logs.length });
  }, 'tunnel:logs')
);

// ── POST /api/tunnel/start ──────────────────────────────────────────────
// Starts the cloudflared tunnel. Body: { mode?, token?, hostname?, localPort?, localProtocol? }
tunnelRouter.post(
  '/start',
  asyncHandler(async (req, res) => {
    if (!CloudflareTunnel.isInstalled()) {
      return sendBadRequest(
        res,
        'cloudflared is not installed. Run `brew install cloudflared` or `make setup-cloudflared`.'
      );
    }

    const {
      mode = 'quick',
      token,
      hostname,
      localPort,
      localProtocol,
    } = req.body as Partial<TunnelConfig>;

    if (mode === 'named' && !token) {
      return sendBadRequest(
        res,
        'Named tunnel mode requires a token. Get one from the Cloudflare dashboard.'
      );
    }

    const config: TunnelConfig = {
      mode: mode as TunnelConfig['mode'],
      token,
      hostname,
      localPort,
      localProtocol,
    };

    try {
      const state = await tunnel.start(config, BACKEND_PORT);
      res.json({ success: true, ...state });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start tunnel';
      res.status(500).json({ success: false, error: message });
    }
  }, 'tunnel:start')
);

// ── POST /api/tunnel/stop ───────────────────────────────────────────────
// Stops the cloudflared tunnel.
tunnelRouter.post(
  '/stop',
  asyncHandler(async (_req, res) => {
    await tunnel.stop();
    res.json({ success: true, status: 'stopped' });
  }, 'tunnel:stop')
);

// ── Helper for doctor check ─────────────────────────────────────────────
export function getTunnelDoctorCheck(): {
  status: 'pass' | 'warn' | 'fail';
  label: string;
  value: string;
  detail?: string;
} {
  const state = tunnel.getState();

  if (!CloudflareTunnel.isInstalled()) {
    return {
      status: 'warn',
      label: 'Cloudflare Tunnel',
      value: 'Not installed',
      detail: 'Run `brew install cloudflared` to enable tunnel access',
    };
  }

  if (state.status === 'running') {
    const url = state.publicUrl || state.hostname || 'connected';
    return {
      status: 'pass',
      label: 'Cloudflare Tunnel',
      value: 'Running',
      detail: url,
    };
  }

  if (state.status === 'error') {
    return {
      status: 'fail',
      label: 'Cloudflare Tunnel',
      value: 'Error',
      detail: state.error ?? undefined,
    };
  }

  return {
    status: 'pass',
    label: 'Cloudflare Tunnel',
    value: 'Stopped',
    detail: `v${CloudflareTunnel.getVersion() ?? 'unknown'} installed`,
  };
}
