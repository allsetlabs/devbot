import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { Clock, MessageCircle, AlertTriangle, Trash2, X } from 'lucide-react';
import type { VoiceTranscript } from '../lib/api';

interface VoiceTranscriptDetailProps {
  transcript: VoiceTranscript | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VoiceTranscriptDetail({
  transcript,
  open,
  onClose,
  onDelete,
}: VoiceTranscriptDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!transcript) return null;

  const sttDiffs = transcript.messages.filter(
    (m) => m.role === 'user' && m.rawStt && m.rawStt !== m.content
  );

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-base">Voice Transcript</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-4 pb-6">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(transcript.sessionStartedAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {transcript.messageCount} messages
              </span>
              <span>{formatDuration(transcript.durationSeconds)}</span>
              {transcript.analyzed ? (
                <Badge variant="secondary" className="text-[10px]">
                  Analyzed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Not analyzed
                </Badge>
              )}
              {sttDiffs.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {sttDiffs.length} STT diff{sttDiffs.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* STT Diffs Section */}
            {sttDiffs.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  STT Corrections
                </div>
                <div className="flex flex-col gap-2">
                  {sttDiffs.map((msg, i) => (
                    <div key={i} className="text-xs">
                      <div className="text-muted-foreground line-through">{msg.rawStt}</div>
                      <div className="text-foreground">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex flex-col gap-2">
              {transcript.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'ml-8 bg-primary/10 text-right'
                      : 'mr-8 bg-muted'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <p className="mt-0.5 leading-relaxed">{msg.content}</p>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Analysis summary */}
            {transcript.analysisSummary && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <span className="font-medium">Analysis:</span> {transcript.analysisSummary}
              </div>
            )}

            {/* Delete */}
            <div className="mt-2 border-t pt-4">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Delete this transcript?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete(transcript.id);
                      setConfirmDelete(false);
                      onClose();
                    }}
                  >
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive md:hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Transcript
                </Button>
              )}
            </div>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
