/**
 * Cloudflare Tunnel process manager.
 *
 * Supports two modes:
 * 1. **Quick tunnel** — `cloudflared tunnel --url http://localhost:PORT`
 *    No config needed. Gives a random `*.trycloudflare.com` URL.
 * 2. **Named tunnel** — `cloudflared tunnel run --token TOKEN`
 *    Uses a pre-configured token from the Cloudflare dashboard.
 *    Maps to a custom domain with optional Cloudflare Access (zero-trust + Google OAuth).
 */

import { spawn, execSync, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export type TunnelMode = 'quick' | 'named';
export type TunnelStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface TunnelConfig {
  mode: TunnelMode;
  /** Token from Cloudflare dashboard (named tunnel mode only). */
  token?: string;
  /** Custom hostname configured in Cloudflare (named tunnel mode only, informational). */
  hostname?: string;
  /** Local port to tunnel. Defaults to BACKEND_PORT. */
  localPort?: number;
  /** Protocol for local connection. Defaults to 'https'. */
  localProtocol?: 'http' | 'https';
}

export interface TunnelState {
  status: TunnelStatus;
  mode: TunnelMode | null;
  publicUrl: string | null;
  hostname: string | null;
  connectedAt: string | null;
  error: string | null;
  pid: number | null;
  metrics: {
    /** Connections established by cloudflared */
    connections: number;
    /** Uptime in seconds */
    uptimeSeconds: number;
  };
}

export class CloudflareTunnel extends EventEmitter {
  private process: ChildProcess | null = null;
  private status: TunnelStatus = 'stopped';
  private mode: TunnelMode | null = null;
  private publicUrl: string | null = null;
  private hostname: string | null = null;
  private connectedAt: string | null = null;
  private error: string | null = null;
  private logBuffer: string[] = [];
  private connections = 0;

  /** Check if `cloudflared` is installed. */
  static isInstalled(): boolean {
    try {
      execSync('which cloudflared', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /** Get `cloudflared` version string. */
  static getVersion(): string | null {
    try {
      const output = execSync('cloudflared --version 2>&1', {
        encoding: 'utf8',
        timeout: 5000,
      }).trim();
      // Output: "cloudflared version 2024.x.x (built ...)"
      const match = output.match(/cloudflared version ([\d.]+)/);
      return match ? match[1] : output.split('\n')[0];
    } catch {
      return null;
    }
  }

  /** Current state snapshot. */
  getState(): TunnelState {
    const uptimeSeconds = this.connectedAt
      ? Math.floor((Date.now() - new Date(this.connectedAt).getTime()) / 1000)
      : 0;

    return {
      status: this.status,
      mode: this.mode,
      publicUrl: this.publicUrl,
      hostname: this.hostname,
      connectedAt: this.connectedAt,
      error: this.error,
      pid: this.process?.pid ?? null,
      metrics: {
        connections: this.connections,
        uptimeSeconds,
      },
    };
  }

  /** Recent log lines from the cloudflared process. */
  getLogs(limit = 100): string[] {
    return this.logBuffer.slice(-limit);
  }

  /** Start the tunnel. Rejects if already running. */
  async start(config: TunnelConfig, backendPort: number): Promise<TunnelState> {
    if (this.status === 'running' || this.status === 'starting') {
      throw new Error(`Tunnel is already ${this.status}`);
    }

    if (!CloudflareTunnel.isInstalled()) {
      throw new Error(
        'cloudflared is not installed. Run `brew install cloudflared` or `make setup-cloudflared`.'
      );
    }

    this.status = 'starting';
    this.mode = config.mode;
    this.error = null;
    this.publicUrl = null;
    this.hostname = config.hostname ?? null;
    this.connections = 0;
    this.logBuffer = [];

    const port = config.localPort ?? backendPort;
    const protocol = config.localProtocol ?? 'https';
    const localUrl = `${protocol}://localhost:${port}`;

    const args = this.buildArgs(config, localUrl);

    return new Promise((resolve, reject) => {
      const proc = spawn('cloudflared', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.process = proc;

      // Timeout for initial connection — 30 seconds
      const startupTimeout = setTimeout(() => {
        if (this.status === 'starting') {
          this.status = 'error';
          this.error = 'Tunnel startup timed out after 30 seconds';
          this.emit('error', this.error);
          reject(new Error(this.error));
        }
      }, 30_000);

      const handleOutput = (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          this.logBuffer.push(line);
          // Cap log buffer at 500 lines
          if (this.logBuffer.length > 500) {
            this.logBuffer.shift();
          }
          this.parseLogLine(line, startupTimeout, resolve);
        }
      };

      proc.stdout?.on('data', handleOutput);
      proc.stderr?.on('data', handleOutput);

      proc.on('error', (err) => {
        clearTimeout(startupTimeout);
        this.status = 'error';
        this.error = err.message;
        this.process = null;
        this.emit('error', this.error);
        reject(err);
      });

      proc.on('exit', (code, signal) => {
        clearTimeout(startupTimeout);
        const prevStatus = this.status;
        this.status = 'stopped';
        this.process = null;

        if (prevStatus === 'running') {
          this.emit('stopped', { code, signal });
          console.log(
            `[tunnel] cloudflared exited (code=${code}, signal=${signal})`
          );
        } else if (prevStatus !== 'error' && prevStatus !== 'stopped') {
          this.error = `cloudflared exited unexpectedly (code=${code})`;
          this.emit('error', this.error);
          reject(new Error(this.error));
        }
      });
    });
  }

  /** Stop the tunnel gracefully. */
  async stop(): Promise<void> {
    if (!this.process) {
      this.status = 'stopped';
      return;
    }

    return new Promise((resolve) => {
      const forceKill = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      this.process!.on('exit', () => {
        clearTimeout(forceKill);
        this.status = 'stopped';
        this.process = null;
        this.publicUrl = null;
        this.connectedAt = null;
        resolve();
      });

      this.process!.kill('SIGTERM');
    });
  }

  /** Build cloudflared CLI args based on config. */
  private buildArgs(config: TunnelConfig, localUrl: string): string[] {
    if (config.mode === 'named' && config.token) {
      // Named tunnel: `cloudflared tunnel run --token <token>`
      // The token encodes the tunnel ID, account, and ingress rules
      return ['tunnel', '--no-autoupdate', 'run', '--token', config.token];
    }

    // Quick tunnel: `cloudflared tunnel --url <localUrl> --no-autoupdate`
    return [
      'tunnel',
      '--no-autoupdate',
      '--url', localUrl,
    ];
  }

  /** Parse a cloudflared log line for connection info. */
  private parseLogLine(
    line: string,
    startupTimeout: NodeJS.Timeout,
    resolveStart: (state: TunnelState) => void
  ): void {
    // Quick tunnel URL assignment:
    // "Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): https://xxx.trycloudflare.com"
    // or: "https://xxx.trycloudflare.com"
    const quickUrlMatch = line.match(
      /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
    );
    if (quickUrlMatch && this.mode === 'quick') {
      this.publicUrl = quickUrlMatch[0];
      console.log(`[tunnel] Quick tunnel URL: ${this.publicUrl}`);
    }

    // Named tunnel connection registered:
    // "Connection ... registered connIndex=0 ..."
    // or: "Registered tunnel connection connIndex=0"
    if (
      line.includes('Registered tunnel connection') ||
      line.includes('registered connIndex')
    ) {
      this.connections++;
    }

    // INF msg="Updated to new configuration" — named tunnel is ready
    // or connection registered — either mode is ready
    if (
      (line.includes('Registered tunnel connection') ||
        line.includes('registered connIndex') ||
        line.includes('Updated to new configuration') ||
        (quickUrlMatch && this.mode === 'quick')) &&
      this.status === 'starting'
    ) {
      clearTimeout(startupTimeout);
      this.status = 'running';
      this.connectedAt = new Date().toISOString();
      const state = this.getState();
      this.emit('connected', state);
      resolveStart(state);
    }

    // Named tunnel — extract hostname from ingress rule logging
    // "Starting tunnel ... hostname=devbot.example.com"
    const hostnameMatch = line.match(/hostname[=:]?\s*([a-z0-9.-]+\.[a-z]{2,})/i);
    if (hostnameMatch && this.mode === 'named' && !this.hostname) {
      this.hostname = hostnameMatch[1];
    }

    // Error detection
    if (
      line.includes('ERR') &&
      (line.includes('failed') || line.includes('error'))
    ) {
      console.error(`[tunnel] ${line}`);
    }
  }
}

// Singleton instance
export const tunnel = new CloudflareTunnel();
