import { useEffect, useCallback } from 'react';
import { useXtermWs } from '../hooks/useXtermWs';

export interface TerminalActions {
  sendCtrlC: () => void;
  sendTab: () => void;
  sendArrowUp: () => void;
  sendArrowDown: () => void;
  sendArrowLeft: () => void;
  sendArrowRight: () => void;
  sendEnter: () => void;
  sendClear: () => void;
  sendEscape: () => void;
  sendKey: (key: string) => void;
  getSelection: () => string;
  paste: (text: string) => void;
  enterTmuxCopyMode: () => void;
  exitTmuxCopyMode: () => void;
  scrollUp: () => void;
  scrollDown: () => void;
}

interface XtermTerminalProps {
  wsUrl: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReady?: (actions: TerminalActions) => void;
}

export function XtermTerminal({ wsUrl, onConnect, onDisconnect, onReady }: XtermTerminalProps) {
  const {
    terminalRef,
    sendCtrlC,
    sendTab,
    sendArrowUp,
    sendArrowDown,
    sendArrowLeft,
    sendArrowRight,
    sendEnter,
    sendClear,
    sendEscape,
    sendKey,
    getSelection,
    paste,
    fit,
    scrollToBottom,
    enterTmuxCopyMode,
    exitTmuxCopyMode,
    scrollUp,
    scrollDown,
  } = useXtermWs({ wsUrl, onConnect, onDisconnect });

  useEffect(() => {
    onReady?.({
      sendCtrlC,
      sendTab,
      sendArrowUp,
      sendArrowDown,
      sendArrowLeft,
      sendArrowRight,
      sendEnter,
      sendClear,
      sendEscape,
      sendKey,
      getSelection,
      paste,
      enterTmuxCopyMode,
      exitTmuxCopyMode,
      scrollUp,
      scrollDown,
    });
  }, [
    onReady,
    sendCtrlC,
    sendTab,
    sendArrowUp,
    sendArrowDown,
    sendArrowLeft,
    sendArrowRight,
    sendEnter,
    sendClear,
    sendEscape,
    sendKey,
    getSelection,
    paste,
    enterTmuxCopyMode,
    exitTmuxCopyMode,
    scrollUp,
    scrollDown,
  ]);

  // Resize terminal when container size changes
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Small delay for layout to settle
      requestAnimationFrame(() => fit());
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [fit, terminalRef]);

  const handleClick = useCallback(() => {
    // Small delay to let keyboard animation start
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      ref={terminalRef}
      className="terminal-container h-full w-full bg-card"
      onClick={handleClick}
    />
  );
}
