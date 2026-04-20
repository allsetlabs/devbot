import { spawn, IPty } from 'node-pty';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import http from 'http';
import https from 'https';

import { XTERM_BASE_PORT, XTERM_MAX_PORT, DEVBOT_PROJECTS_DIR } from './env.js';
import { loadDevCert } from './https-cert.js';

const BASE_PORT = XTERM_BASE_PORT;
const MAX_PORT = XTERM_MAX_PORT;

interface XtermSession {
  wss: WebSocketServer;
  httpServer: http.Server | https.Server;
  pty: IPty | null;
  port: number;
}

// Track active xterm WebSocket servers by port
const xtermSessions = new Map<number, XtermSession>();

/**
 * Get the next available port for xterm WebSocket
 */
export async function getXtermPort(): Promise<number | null> {
  for (let port = BASE_PORT; port <= MAX_PORT; port++) {
    if (!xtermSessions.has(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Start xterm WebSocket server on a specific port, attached to a tmux session
 */
export async function startXtermWs(port: number, tmuxSessionName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const devCert = loadDevCert();
      const httpServer = devCert
        ? https.createServer(devCert)
        : http.createServer();
      const wss = new WebSocketServer({ server: httpServer });

      const session: XtermSession = {
        wss,
        httpServer,
        pty: null,
        port,
      };

      wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
        console.log(`xterm-ws[${port}]: Client connected`);

        // Spawn tmux attach for this connection
        const pty = spawn('tmux', ['attach-session', '-t', tmuxSessionName], {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: DEVBOT_PROJECTS_DIR,
          env: process.env as Record<string, string>,
        });

        session.pty = pty;

        // PTY -> WebSocket
        pty.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          console.log(`xterm-ws[${port}]: PTY exited with code ${exitCode}`);
          ws.close();
        });

        // WebSocket -> PTY
        ws.on('message', (message: Buffer | string) => {
          const data = message.toString();

          // Handle resize messages (JSON format: { type: 'resize', cols: number, rows: number })
          if (data.startsWith('{')) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
                pty.resize(parsed.cols, parsed.rows);
                return;
              }
            } catch {
              // Not JSON, treat as input
            }
          }

          pty.write(data);
        });

        ws.on('close', () => {
          console.log(`xterm-ws[${port}]: Client disconnected`);
          pty.kill();
          session.pty = null;
        });

        ws.on('error', (error: Error) => {
          console.error(`xterm-ws[${port}]: WebSocket error:`, error);
          pty.kill();
        });
      });

      httpServer.on('listening', () => {
        console.log(`xterm-ws[${port}]: Listening on port ${port} (${devCert ? 'wss' : 'ws'})`);
        xtermSessions.set(port, session);
        resolve();
      });

      httpServer.on('error', (error: Error) => {
        console.error(`xterm-ws[${port}]: Server error:`, error);
        reject(error);
      });

      httpServer.listen(port, '0.0.0.0');
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop xterm WebSocket server on a specific port
 */
export async function stopXtermWs(port: number): Promise<void> {
  const session = xtermSessions.get(port);
  if (session) {
    if (session.pty) {
      session.pty.kill();
    }
    session.wss.close();
    session.httpServer.close();
    xtermSessions.delete(port);
    console.log(`xterm-ws[${port}]: Stopped`);
  }
}

/**
 * Get all active xterm ports
 */
export function getActiveXtermPorts(): number[] {
  return Array.from(xtermSessions.keys());
}

/**
 * Check if a port already has an active xterm session
 */
export function isPortActive(port: number): boolean {
  return xtermSessions.has(port);
}
