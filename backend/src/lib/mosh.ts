import { exec, spawn as cpSpawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { MOSH_BASE_PORT, MOSH_MAX_PORT } from './env.js';

export interface MoshServerInfo {
  key: string;
  udpPort: number;
  pid: number;
}

// Track active mosh servers by session name
const activeMoshServers = new Map<string, MoshServerInfo>();

/**
 * Start a mosh-server attached to a tmux session.
 * mosh-server outputs "MOSH CONNECT <port> <key>" on stderr,
 * then forks into the background.
 */
export async function startMoshServer(tmuxSessionName: string): Promise<MoshServerInfo> {
  return new Promise((resolve, reject) => {
    // mosh-server new: starts a new server, outputs connection info, then backgrounds
    // -p: port range
    // --: command to run (tmux attach)
    const child = cpSpawn(
      'mosh-server',
      [
        'new',
        '-p',
        `${MOSH_BASE_PORT}:${MOSH_MAX_PORT}`,
        '--',
        'tmux',
        'attach-session',
        '-t',
        tmuxSessionName,
      ],
      {
        env: {
          ...process.env,
          MOSH_SERVER_NETWORK_TMOUT: '604800', // 7 days before timeout
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stderr = '';
    let stdout = '';

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      // mosh-server outputs: MOSH CONNECT <port> <key>
      // It may be on stdout or stderr depending on version
      const combined = stdout + stderr;
      const match = combined.match(/MOSH CONNECT (\d+) (\S+)/);

      if (!match) {
        reject(new Error(`mosh-server failed (exit ${code}): ${combined}`));
        return;
      }

      const info: MoshServerInfo = {
        udpPort: parseInt(match[1], 10),
        key: match[2],
        pid: child.pid || 0,
      };

      activeMoshServers.set(tmuxSessionName, info);
      console.log(`mosh: Server started for ${tmuxSessionName} on UDP port ${info.udpPort}`);
      resolve(info);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start mosh-server: ${err.message}`));
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('mosh-server startup timed out'));
    }, 10000);
  });
}

/**
 * Stop a mosh-server by killing its process on the UDP port
 */
export async function stopMoshServer(tmuxSessionName: string): Promise<void> {
  const info = activeMoshServers.get(tmuxSessionName);
  activeMoshServers.delete(tmuxSessionName);

  if (info) {
    try {
      // Kill mosh-server process listening on the UDP port
      await execAsync(`lsof -ti udp:${info.udpPort} | xargs kill -9 2>/dev/null || true`);
      console.log(`mosh: Stopped server for ${tmuxSessionName} on UDP port ${info.udpPort}`);
    } catch {
      // Process may already be dead
    }
  }
}

/**
 * Get mosh server info for a session
 */
export function getMoshServerInfo(tmuxSessionName: string): MoshServerInfo | undefined {
  return activeMoshServers.get(tmuxSessionName);
}

/**
 * Register an existing mosh server (used during session recovery)
 */
export function registerMoshServer(tmuxSessionName: string, info: MoshServerInfo): void {
  activeMoshServers.set(tmuxSessionName, info);
}

/**
 * Check if mosh-server binary is available
 */
export async function isMoshAvailable(): Promise<boolean> {
  try {
    await execAsync('which mosh-server');
    return true;
  } catch {
    return false;
  }
}
