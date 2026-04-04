import { useState, useEffect, useCallback, useRef } from 'react';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useTemporaryStatus } from '../hooks/useTemporaryStatus';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allsetlabs/reusable/components/ui/dialog';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import { ArrowLeft, Trash2, Wifi, WifiOff, Upload, ImageIcon } from 'lucide-react';
import { api, uploadImage, getXtermWsUrl } from '../lib/api';
import { XtermTerminal, type TerminalActions } from '../components/XtermTerminal';
import { KeyBar } from '../components/KeyBar';
import { ScrollControl } from '../components/ScrollControl';

export function ChatView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { status: uploadStatus, show: showStatus } = useTemporaryStatus(3000);
  const [connected, setConnected] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const terminalActionsRef = useRef<TerminalActions | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/cli');
    }
  }, [sessionId, navigate]);

  const {
    data: session,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  });

  const error =
    queryError instanceof Error ? queryError.message : queryError ? 'Failed to load session' : null;

  const deleteMutation = useCrudMutation(() => api.deleteSession(sessionId!), [['sessions']], {
    onSuccess: () => navigate('/cli'),
  });

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showStatus('Please drop an image file');
        return;
      }

      try {
        showStatus('Uploading...');
        const result = await uploadImage(file);
        showStatus('Uploaded! Path: ' + result.path);
      } catch (err) {
        showStatus(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [showStatus]
  );

  const onDropFiles = useCallback(
    (files: File[]) => {
      handleFileDrop(files[0]);
    },
    [handleFileDrop]
  );
  const { isDragging } = useDragAndDrop(onDropFiles);

  const handleDeleteSession = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm('Are you sure you want to end this session?');
    if (!confirmed) return;

    deleteMutation.mutate();
  };

  const handleBack = () => navigate('/cli');
  const handleConnect = useCallback(() => setConnected(true), []);
  const handleDisconnect = useCallback(() => setConnected(false), []);
  const handleTerminalReady = useCallback((actions: TerminalActions) => {
    terminalActionsRef.current = actions;
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        terminalActionsRef.current?.paste(text);
        showStatus('Pasted from clipboard');
      }
    } catch {
      setPasteModalOpen(true);
    }
  }, [showStatus]);

  const handlePasteModalSubmit = useCallback(() => {
    if (pasteText.trim()) {
      terminalActionsRef.current?.paste(pasteText);
      showStatus('Pasted to terminal');
    }
    setPasteText('');
    setPasteModalOpen(false);
  }, [pasteText, showStatus]);

  const xtermWsUrl = session ? getXtermWsUrl(session.port) : null;

  return (
    <div className="safe-area-top flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="max-w-[150px] truncate text-sm font-semibold text-foreground">
              {session?.name || 'New CLI'}
            </span>
            {connected ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleDeleteSession} disabled={!session}>
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </header>

      {/* Terminal area - takes remaining height */}
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-card">
            <div className="text-muted-foreground">Connecting...</div>
          </div>
        ) : error || !session || !xtermWsUrl ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-card px-6">
            <div className="text-center text-destructive">{error || 'Session not found'}</div>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        ) : (
          <>
            <XtermTerminal
              wsUrl={xtermWsUrl}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onReady={handleTerminalReady}
            />
            <ScrollControl
              onScrollUp={() => terminalActionsRef.current?.scrollUp()}
              onScrollDown={() => terminalActionsRef.current?.scrollDown()}
              onScrollStart={() => terminalActionsRef.current?.enterTmuxCopyMode()}
              onScrollEnd={() => terminalActionsRef.current?.exitTmuxCopyMode()}
            />
          </>
        )}

        {/* Drop zone overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-sm">
            <div className="rounded-xl border-2 border-dashed border-primary bg-background/90 p-8">
              <div className="flex flex-col items-center gap-3">
                <ImageIcon className="h-12 w-12 text-primary" />
                <span className="text-lg font-medium text-foreground">Drop image here</span>
                <span className="text-sm text-muted-foreground">
                  Image path will be sent to terminal
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Upload status toast */}
        {uploadStatus && (
          <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-background shadow-lg">
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">{uploadStatus}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <KeyBar
        onArrowUp={() => terminalActionsRef.current?.sendArrowUp()}
        onArrowDown={() => terminalActionsRef.current?.sendArrowDown()}
        onArrowLeft={() => terminalActionsRef.current?.sendArrowLeft()}
        onArrowRight={() => terminalActionsRef.current?.sendArrowRight()}
        onEnter={() => terminalActionsRef.current?.sendEnter()}
        onPaste={handlePaste}
        onClear={() => terminalActionsRef.current?.sendClear()}
      />

      {/* Paste modal */}
      <Dialog open={pasteModalOpen} onOpenChange={setPasteModalOpen}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Paste Text</DialogTitle>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Long-press here and select Paste"
            className="min-h-[120px] font-mono text-sm"
          />
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setPasteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handlePasteModalSubmit}
              className="flex-1"
              disabled={!pasteText.trim()}
            >
              Paste to Terminal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
