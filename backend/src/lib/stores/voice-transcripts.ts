/**
 * Voice Transcripts Store — persists every voice conversation to a JSON file.
 *
 * Each record captures a full voice session: all user/assistant messages,
 * the raw STT outputs (for dictionary learning), timestamps, and duration.
 * Used by the daily dictionary-analysis scheduler to identify STT errors
 * and build/update the corrections dictionary.
 */

import path from 'path';
import { FileStore } from '../file-store.js';
import { createFileStoreRouter } from '../file-store-router.js';
import type { FileStoreRecord } from '../file-store.js';
import { DEVBOT_PROJECTS_DIR } from '../env.js';

// ---------------------------------------------------------------------------
// Record type
// ---------------------------------------------------------------------------

export interface VoiceTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Raw STT output before corrections (user messages only) */
  rawStt?: string;
  timestamp: string;
}

export interface VoiceTranscriptRecord extends FileStoreRecord {
  /** Original voice session ID */
  sessionId: string;
  /** All messages exchanged during the session */
  messages: VoiceTranscriptMessage[];
  /** Number of messages in the conversation */
  messageCount: number;
  /** Duration of the session in seconds */
  durationSeconds: number;
  /** When the voice session started */
  sessionStartedAt: string;
  /** When the voice session ended */
  sessionEndedAt: string;
  /** Whether dictionary analysis has been run on this transcript */
  analyzed: boolean;
  /** Summary generated during analysis (if any) */
  analysisSummary?: string;
}

// ---------------------------------------------------------------------------
// Store instance
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'file-stores');

export const voiceTranscriptsStore = new FileStore<VoiceTranscriptRecord>({
  filePath: path.join(DATA_DIR, 'voice-transcripts.json'),
  name: 'voice-transcripts',
  autoCommit: false,
  commitPrefix: 'data',
});

// ---------------------------------------------------------------------------
// Router (ready to mount)
// ---------------------------------------------------------------------------

export const voiceTranscriptsRouter = createFileStoreRouter(voiceTranscriptsStore, {
  requiredFields: ['sessionId', 'messages'],
  beforeCreate: (data) => ({
    ...data,
    messageCount: Array.isArray(data.messages) ? (data.messages as unknown[]).length : 0,
    durationSeconds: data.durationSeconds ?? 0,
    sessionStartedAt: data.sessionStartedAt ?? new Date().toISOString(),
    sessionEndedAt: data.sessionEndedAt ?? new Date().toISOString(),
    analyzed: data.analyzed ?? false,
    analysisSummary: data.analysisSummary ?? '',
  }),
});
