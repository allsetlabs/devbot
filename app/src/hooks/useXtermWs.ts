import { useRef, useEffect, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

interface UseXtermWsOptions {
  wsUrl: string;
  onDisconnect?: () => void;
  onConnect?: () => void;
  onReconnecting?: (attempt: number) => void;
  autoReconnect?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 20;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useXtermWs({
  wsUrl,
  onDisconnect,
  onConnect,
  onReconnecting,
  autoReconnect = true,
}: UseXtermWsOptions) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  const sendKey = useCallback((key: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(key);
    }
  }, []);

  const sendCtrlC = useCallback(() => {
    sendKey('\x03');
  }, [sendKey]);

  const sendTab = useCallback(() => {
    sendKey('\t');
  }, [sendKey]);

  const sendArrowUp = useCallback(() => {
    sendKey('\x1b[A');
  }, [sendKey]);

  const sendArrowDown = useCallback(() => {
    sendKey('\x1b[B');
  }, [sendKey]);

  const sendArrowLeft = useCallback(() => {
    sendKey('\x1b[D');
  }, [sendKey]);

  const sendArrowRight = useCallback(() => {
    sendKey('\x1b[C');
  }, [sendKey]);

  const sendEnter = useCallback(() => {
    sendKey('\r');
  }, [sendKey]);

  const sendClear = useCallback(() => {
    sendKey('\x0c'); // Ctrl+L - clear screen
  }, [sendKey]);

  const sendEscape = useCallback(() => {
    sendKey('\x1b');
  }, [sendKey]);

  // Tmux scroll functions
  const enterTmuxCopyMode = useCallback(() => {
    sendKey('\x02['); // Ctrl+b then [
  }, [sendKey]);

  const exitTmuxCopyMode = useCallback(() => {
    sendKey('q'); // q to exit copy-mode
  }, [sendKey]);

  const scrollUp = useCallback(() => {
    const upArrows = '\x1b[A'.repeat(12);
    sendKey(upArrows);
  }, [sendKey]);

  const scrollDown = useCallback(() => {
    const downArrows = '\x1b[B'.repeat(12);
    sendKey(downArrows);
  }, [sendKey]);

  const getSelection = useCallback(() => {
    if (terminalInstanceRef.current) {
      return terminalInstanceRef.current.getSelection();
    }
    return '';
  }, []);

  const paste = useCallback(
    (text: string) => {
      if (text) {
        sendKey(text);
      }
    },
    [sendKey]
  );

  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalInstanceRef.current) {
      fitAddonRef.current.fit();
      const { cols, rows } = terminalInstanceRef.current;
      sendResize(cols, rows);
    }
  }, [sendResize]);

  const scrollToBottom = useCallback(() => {
    terminalInstanceRef.current?.scrollToBottom();
  }, []);

  useEffect(() => {
    if (!terminalRef.current || !wsUrl) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#3d3d3d',
        black: '#1a1a1a',
        red: '#ff6b6b',
        green: '#69db7c',
        yellow: '#fcc419',
        blue: '#4dabf7',
        magenta: '#da77f2',
        cyan: '#3bc9db',
        white: '#e0e0e0',
        brightBlack: '#4a4a4a',
        brightRed: '#ff8787',
        brightGreen: '#8ce99a',
        brightYellow: '#ffd43b',
        brightBlue: '#74c0fc',
        brightMagenta: '#e599f7',
        brightCyan: '#66d9e8',
        brightWhite: '#ffffff',
      },
      scrollback: 10000,
      allowProposedApi: true,
      smoothScrollDuration: 100,
      scrollOnUserInput: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Manual touch scroll handling for mobile
    const viewport = terminalRef.current.querySelector('.xterm-viewport') as HTMLElement;
    const screen = terminalRef.current.querySelector('.xterm-screen') as HTMLElement;

    let touchStartY = 0;
    let scrollStartTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        scrollStartTop = viewport?.scrollTop || 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && viewport) {
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;
        viewport.scrollTop = scrollStartTop + deltaY;

        if (viewport.scrollHeight > viewport.clientHeight) {
          e.preventDefault();
        }
      }
    };

    if (screen) {
      screen.addEventListener('touchstart', handleTouchStart, { passive: true });
      screen.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Connection management with auto-reconnect
    intentionalCloseRef.current = false;
    reconnectAttemptRef.current = 0;

    function connectWs() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;

        // Send initial resize
        const { cols, rows } = terminal;
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));

        // Start heartbeat (ping every 15s to detect broken connections)
        clearHeartbeat();
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 15000);

        onConnect?.();
      };

      ws.onmessage = (event) => {
        terminal.write(event.data);
      };

      ws.onclose = () => {
        clearHeartbeat();

        if (intentionalCloseRef.current) {
          terminal.write('\r\n\x1b[31m[Disconnected]\x1b[0m\r\n');
          onDisconnect?.();
          return;
        }

        // Auto-reconnect with exponential backoff
        if (autoReconnect && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current++;
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptRef.current - 1),
            MAX_RECONNECT_DELAY
          );

          terminal.write(
            `\r\n\x1b[33m[Connection lost - reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS})...]\x1b[0m\r\n`
          );
          onReconnecting?.(reconnectAttemptRef.current);

          clearReconnectTimer();
          reconnectTimerRef.current = setTimeout(connectWs, delay);
        } else {
          terminal.write('\r\n\x1b[31m[Disconnected]\x1b[0m\r\n');
          onDisconnect?.();
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, so reconnect logic is handled there
      };

      // Handle terminal input
      terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle resize
      terminal.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
    }

    connectWs();

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    // Reconnect on app resume (mobile: coming back from background)
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        wsRef.current?.readyState !== WebSocket.OPEN &&
        wsRef.current?.readyState !== WebSocket.CONNECTING &&
        !intentionalCloseRef.current
      ) {
        // Reset reconnect attempts when user actively returns to app
        reconnectAttemptRef.current = 0;
        clearReconnectTimer();
        connectWs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      intentionalCloseRef.current = true;
      clearReconnectTimer();
      clearHeartbeat();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (screen) {
        screen.removeEventListener('touchstart', handleTouchStart);
        screen.removeEventListener('touchmove', handleTouchMove);
      }
      wsRef.current?.close();
      terminal.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      wsRef.current = null;
    };
  }, [
    wsUrl,
    onConnect,
    onDisconnect,
    onReconnecting,
    autoReconnect,
    clearReconnectTimer,
    clearHeartbeat,
  ]);

  return {
    terminalRef,
    sendKey,
    sendCtrlC,
    sendTab,
    sendArrowUp,
    sendArrowDown,
    sendArrowLeft,
    sendArrowRight,
    sendEnter,
    sendClear,
    sendEscape,
    getSelection,
    paste,
    fit,
    scrollToBottom,
    enterTmuxCopyMode,
    exitTmuxCopyMode,
    scrollUp,
    scrollDown,
  };
}
