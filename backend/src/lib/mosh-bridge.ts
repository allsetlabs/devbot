import { spawn, IPty } from 'node-pty';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

const BRIDGE_BASE_PORT = parseInt(process.env.MOSH_BRIDGE_BASE_PORT || '7850', 10);
const BRIDGE_MAX_PORT = parseInt(process.env.MOSH_BRIDGE_MAX_PORT || '7899', 10);

interface MoshBridgeSession {
  wss: WebSocketServer;
  moshClient: IPty | null;
  activeWs: WebSocket | null;
  moshKey: string;
  moshUdpPort: number;
  serverHost: string;
  port: number;
  // Ring buffer for output during disconnect (last 64KB)
  outputBuffer: string;
}

const MAX_BUFFER_SIZE = 64 * 1024;

// Track active bridge sessions by WebSocket port
const bridgeSessions = new Map<number, MoshBridgeSession>();

/**
 * Get next available port for mosh bridge WebSocket server
 */
export async function getMoshBridgePort(): Promise<number | null> {
  for (let port = BRIDGE_BASE_PORT; port <= BRIDGE_MAX_PORT; port++) {
    if (!bridgeSessions.has(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Spawn a mosh-client PTY that connects to a mosh-server
 */
function spawnMoshClient(moshKey: string, moshUdpPort: number, serverHost: string): IPty {
  return spawn('mosh-client', [serverHost, String(moshUdpPort)], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.CLAUDE_WORK_DIR || process.cwd(),
    env: {
      ...(process.env as Record<string, string>),
      MOSH_KEY: moshKey,
    },
  });
}

/**
 * Start a mosh bridge WebSocket server.
 * This bridges between the mobile WebSocket client and a persistent mosh-client PTY.
 * The mosh-client stays alive even when the WebSocket disconnects.
 */
export async function startMoshBridge(
  wsPort: number,
  moshKey: string,
  moshUdpPort: number,
  serverHost = '127.0.0.1'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const wss = new WebSocketServer({ port: wsPort, host: '0.0.0.0' });

      const session: MoshBridgeSession = {
        wss,
        moshClient: null,
        activeWs: null,
        moshKey,
        moshUdpPort,
        serverHost,
        port: wsPort,
        outputBuffer: '',
      };

      // Spawn the persistent mosh-client immediately
      try {
        const moshClient = spawnMoshClient(moshKey, moshUdpPort, serverHost);
        session.moshClient = moshClient;

        // Continuously read from mosh-client (even without WebSocket)
        moshClient.onData((data: string) => {
          // Append to ring buffer
          session.outputBuffer += data;
          if (session.outputBuffer.length > MAX_BUFFER_SIZE) {
            session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_SIZE);
          }

          // Forward to active WebSocket if connected
          if (session.activeWs?.readyState === WebSocket.OPEN) {
            session.activeWs.send(data);
          }
        });

        moshClient.onExit(({ exitCode }: { exitCode: number }) => {
          console.log(`mosh-bridge[${wsPort}]: mosh-client exited with code ${exitCode}`);
          session.moshClient = null;

          // Notify connected client
          if (session.activeWs?.readyState === WebSocket.OPEN) {
            session.activeWs.send(
              '\r\n\x1b[33m[Mosh client disconnected - reconnecting...]\x1b[0m\r\n'
            );
          }

          // Attempt to respawn mosh-client
          setTimeout(() => {
            if (bridgeSessions.has(wsPort)) {
              try {
                const newClient = spawnMoshClient(moshKey, moshUdpPort, serverHost);
                session.moshClient = newClient;
                setupMoshClientHandlers(session, wsPort);
                console.log(`mosh-bridge[${wsPort}]: mosh-client respawned`);
              } catch (err) {
                console.error(`mosh-bridge[${wsPort}]: Failed to respawn mosh-client:`, err);
              }
            }
          }, 1000);
        });
      } catch (err) {
        console.error(`mosh-bridge[${wsPort}]: Failed to spawn mosh-client:`, err);
        // Will spawn on first WebSocket connection
      }

      wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
        console.log(`mosh-bridge[${wsPort}]: Client connected`);

        // Close any existing WebSocket connection (only one client at a time)
        if (session.activeWs && session.activeWs !== ws) {
          session.activeWs.close();
        }
        session.activeWs = ws;

        // If mosh-client isn't running, spawn it
        if (!session.moshClient) {
          try {
            const moshClient = spawnMoshClient(moshKey, moshUdpPort, serverHost);
            session.moshClient = moshClient;
            setupMoshClientHandlers(session, wsPort);
          } catch (err) {
            console.error(`mosh-bridge[${wsPort}]: Failed to spawn mosh-client:`, err);
            ws.send('\r\n\x1b[31m[Failed to connect to mosh server]\x1b[0m\r\n');
            return;
          }
        }

        // Send buffered output to catch up the client
        if (session.outputBuffer.length > 0) {
          ws.send(session.outputBuffer);
        }

        // Send resize to force mosh-client to redraw current state
        // (The buffered output may not represent a clean screen state)

        // WebSocket → mosh-client PTY
        ws.on('message', (message: Buffer | string) => {
          if (!session.moshClient) return;

          const data = message.toString();

          // Handle resize messages
          if (data.startsWith('{')) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
                session.moshClient.resize(parsed.cols, parsed.rows);
                return;
              }
            } catch {
              // Not JSON, treat as input
            }
          }

          session.moshClient.write(data);
        });

        ws.on('close', () => {
          console.log(`mosh-bridge[${wsPort}]: Client disconnected (mosh-client stays alive)`);
          session.activeWs = null;
          // NOTE: We do NOT kill the mosh-client here!
          // It stays alive, maintaining the mosh connection to the server.
        });

        ws.on('error', (error: Error) => {
          console.error(`mosh-bridge[${wsPort}]: WebSocket error:`, error);
          session.activeWs = null;
        });
      });

      wss.on('listening', () => {
        console.log(`mosh-bridge[${wsPort}]: Listening on port ${wsPort}`);
        bridgeSessions.set(wsPort, session);
        resolve();
      });

      wss.on('error', (error: Error) => {
        console.error(`mosh-bridge[${wsPort}]: Server error:`, error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set up event handlers for a mosh-client PTY (used when respawning)
 */
function setupMoshClientHandlers(session: MoshBridgeSession, wsPort: number): void {
  if (!session.moshClient) return;

  session.moshClient.onData((data: string) => {
    session.outputBuffer += data;
    if (session.outputBuffer.length > MAX_BUFFER_SIZE) {
      session.outputBuffer = session.outputBuffer.slice(-MAX_BUFFER_SIZE);
    }

    if (session.activeWs?.readyState === WebSocket.OPEN) {
      session.activeWs.send(data);
    }
  });

  session.moshClient.onExit(({ exitCode }: { exitCode: number }) => {
    console.log(`mosh-bridge[${wsPort}]: mosh-client exited with code ${exitCode}`);
    session.moshClient = null;
  });
}

/**
 * Stop a mosh bridge and its mosh-client
 */
export async function stopMoshBridge(port: number): Promise<void> {
  const session = bridgeSessions.get(port);
  if (session) {
    if (session.moshClient) {
      session.moshClient.kill();
    }
    if (session.activeWs) {
      session.activeWs.close();
    }
    session.wss.close();
    bridgeSessions.delete(port);
    console.log(`mosh-bridge[${port}]: Stopped`);
  }
}

/**
 * Get all active mosh bridge ports
 */
export function getActiveMoshBridgePorts(): number[] {
  return Array.from(bridgeSessions.keys());
}

/**
 * Check if a port already has an active mosh bridge
 */
export function isMoshBridgePortActive(port: number): boolean {
  return bridgeSessions.has(port);
}
