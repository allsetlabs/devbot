import { spawn, IPty } from 'node-pty';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

import { XTERM_BASE_PORT, XTERM_MAX_PORT, CLAUDE_WORK_DIR } from './env.js';

const BASE_PORT = XTERM_BASE_PORT;
const MAX_PORT = XTERM_MAX_PORT;

interface XtermSession {
  wss: WebSocketServer;
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
      const wss = new WebSocketServer({ port, host: '0.0.0.0' });

      const session: XtermSession = {
        wss,
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
          cwd: CLAUDE_WORK_DIR,
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

      wss.on('listening', () => {
        console.log(`xterm-ws[${port}]: Listening on port ${port}`);
        xtermSessions.set(port, session);
        resolve();
      });

      wss.on('error', (error: Error) => {
        console.error(`xterm-ws[${port}]: Server error:`, error);
        reject(error);
      });
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
