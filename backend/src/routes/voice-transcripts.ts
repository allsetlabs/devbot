/**
 * Voice Transcript Analysis Routes
 *
 * Endpoints for analyzing saved voice transcripts to identify STT errors,
 * build a custom corrections dictionary, and get transcript statistics.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../lib/route-helpers.js';
import {
  voiceTranscriptsStore,
  type VoiceTranscriptRecord,
} from '../lib/stores/voice-transcripts.js';
import { ollamaGenerate, isOllamaAvailable, STT_CORRECTION_MODEL } from '../lib/ollama.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';

export const voiceTranscriptAnalysisRouter = Router();

const DEVBOT_DIR = path.join(DEVBOT_PROJECTS_DIR, '.devbot');
const STT_CORRECTIONS_PATH = path.join(DEVBOT_DIR, 'stt-corrections-dictionary.json');

type CorrectionDictionary = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Dictionary helpers (shared with stt.ts — keep in sync)
// ---------------------------------------------------------------------------

function readCorrections(): CorrectionDictionary {
  try {
    if (fs.existsSync(STT_CORRECTIONS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STT_CORRECTIONS_PATH, 'utf8'));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const normalized: CorrectionDictionary = {};
      for (const [key, entry] of Object.entries(raw)) {
        if (Array.isArray(entry) && entry.every((v) => typeof v === 'string')) {
          normalized[key] = [...new Set((entry as string[]).map((v) => v.trim()).filter(Boolean))];
        }
      }
      return normalized;
    }
  } catch {
    // return empty on parse error
  }
  return {};
}

function saveCorrections(corrections: CorrectionDictionary): void {
  if (!fs.existsSync(DEVBOT_DIR)) fs.mkdirSync(DEVBOT_DIR, { recursive: true });
  fs.writeFileSync(STT_CORRECTIONS_PATH, JSON.stringify(corrections, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// GET /api/voice-transcripts/stats — aggregate statistics
// ---------------------------------------------------------------------------

voiceTranscriptAnalysisRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const transcripts = await voiceTranscriptsStore.list();

    const totalSessions = transcripts.length;
    const totalMessages = transcripts.reduce((sum, t) => sum + t.messageCount, 0);
    const totalDurationSeconds = transcripts.reduce((sum, t) => sum + t.durationSeconds, 0);
    const analyzedCount = transcripts.filter((t) => t.analyzed).length;
    const unanalyzedCount = totalSessions - analyzedCount;

    // Count messages with raw STT differences (potential errors)
    let messagesWithSttDiffs = 0;
    for (const t of transcripts) {
      for (const m of t.messages) {
        if (m.role === 'user' && m.rawStt && m.rawStt !== m.content) {
          messagesWithSttDiffs++;
        }
      }
    }

    // Group by date
    const byDate: Record<string, number> = {};
    for (const t of transcripts) {
      const date = t.sessionStartedAt.slice(0, 10);
      byDate[date] = (byDate[date] ?? 0) + 1;
    }

    const corrections = readCorrections();

    // Format total duration for display
    const h = Math.floor(totalDurationSeconds / 3600);
    const m = Math.floor((totalDurationSeconds % 3600) / 60);
    const s = totalDurationSeconds % 60;
    let totalDurationFormatted = '0s';
    if (h > 0) totalDurationFormatted = `${h}h ${m}m`;
    else if (m > 0) totalDurationFormatted = `${m}m ${s}s`;
    else totalDurationFormatted = `${s}s`;

    res.json({
      totalSessions,
      totalMessages,
      totalDurationSeconds,
      totalDurationFormatted,
      analyzedCount,
      unanalyzedCount,
      sttDiffCount: messagesWithSttDiffs,
      dictionaryEntries: Object.keys(corrections).length,
      sessionsByDate: byDate,
    });
  }, 'get transcript stats')
);

// ---------------------------------------------------------------------------
// POST /api/voice-transcripts/analyze — analyze unanalyzed transcripts
// Extracts STT errors from rawStt vs content differences and updates
// the corrections dictionary. Optionally uses Ollama for deeper analysis.
// ---------------------------------------------------------------------------

voiceTranscriptAnalysisRouter.post(
  '/analyze',
  asyncHandler(async (_req, res) => {
    const transcripts = await voiceTranscriptsStore.list();
    const unanalyzed = transcripts.filter((t) => !t.analyzed);

    if (unanalyzed.length === 0) {
      res.json({
        analyzed: 0,
        newCorrections: 0,
        message: 'No unanalyzed transcripts found',
      });
      return;
    }

    const corrections = readCorrections();
    let newCorrections = 0;
    const analysisResults: Array<{
      transcriptId: string;
      corrections: CorrectionDictionary;
      summary: string;
    }> = [];

    // Step 1: Extract direct STT diffs (rawStt ≠ content)
    const directDiffs: Array<{ rawStt: string; corrected: string }> = [];
    for (const t of unanalyzed) {
      for (const m of t.messages) {
        if (m.role === 'user' && m.rawStt && m.rawStt !== m.content) {
          directDiffs.push({ rawStt: m.rawStt, corrected: m.content });
        }
      }
    }

    // Step 2: Use Ollama to identify correction patterns from diffs
    const ollamaAvailable = await isOllamaAvailable(STT_CORRECTION_MODEL);

    if (ollamaAvailable && directDiffs.length > 0) {
      // Batch diffs (max 10 per Ollama call to keep prompts manageable)
      const batches: Array<typeof directDiffs> = [];
      for (let i = 0; i < directDiffs.length; i += 10) {
        batches.push(directDiffs.slice(i, i + 10));
      }

      for (const batch of batches) {
        const diffsText = batch
          .map((d, i) => `${i + 1}. STT: "${d.rawStt}" → Corrected: "${d.corrected}"`)
          .join('\n');

        const prompt = `You are analyzing speech-to-text corrections to build a vocabulary correction dictionary.

Here are STT outputs compared to the user's corrected versions:
${diffsText}

Identify only genuine speech-to-text errors — words or phrases the STT misheard. Ignore cases where the user simply added more text, changed their mind, or rephrased intentionally.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasCorrections": boolean,
  "replacements": {"correct phrase": ["misheard variant 1", "misheard variant 2"]},
  "summary": "one-line description of patterns found"
}`;

        try {
          const output = await ollamaGenerate(STT_CORRECTION_MODEL, prompt, 30_000);
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]) as {
              hasCorrections: boolean;
              replacements: CorrectionDictionary;
              summary: string;
            };

            if (analysis.hasCorrections && analysis.replacements) {
              for (const [correct, variants] of Object.entries(analysis.replacements)) {
                const existing = corrections[correct] ?? [];
                const merged = [...new Set([...existing, ...variants])];
                if (merged.length > existing.length) {
                  newCorrections += merged.length - existing.length;
                }
                corrections[correct] = merged;
              }

              analysisResults.push({
                transcriptId: 'batch',
                corrections: analysis.replacements,
                summary: analysis.summary,
              });
            }
          }
        } catch (err) {
          console.error('[voice-transcripts] Ollama analysis failed:', err);
        }
      }
    }

    // Step 3: Simple pattern matching for common app-specific terms
    // even without Ollama — detect frequent misheard words
    const appTerms: CorrectionDictionary = {
      DevBot: ['dev bot', 'dev bought', 'dev bought', 'deaf bot', 'death bot'],
      Claude: ['cloud', 'clod', 'clawed'],
      Anthropic: ['anthropik', 'anthropick'],
      scheduler: ['schedule her', 'scheduled her'],
      Supabase: ['super base', 'soup a base', 'super bass'],
    };

    for (const [correct, variants] of Object.entries(appTerms)) {
      if (!corrections[correct]) {
        corrections[correct] = variants;
      } else {
        const merged = [...new Set([...corrections[correct], ...variants])];
        corrections[correct] = merged;
      }
    }

    // Save updated corrections
    saveCorrections(corrections);

    // Step 4: Mark transcripts as analyzed
    for (const t of unanalyzed) {
      const summary =
        analysisResults.map((r) => r.summary).join('; ') ||
        `Analyzed ${directDiffs.length} STT differences`;
      await voiceTranscriptsStore.update(t.id, {
        analyzed: true,
        analysisSummary: summary,
        updated_by: 'analyzer',
      } as Partial<VoiceTranscriptRecord>);
    }

    res.json({
      analyzed: unanalyzed.length,
      directDiffs: directDiffs.length,
      newCorrections,
      totalDictionarySize: Object.keys(corrections).length,
      ollamaUsed: ollamaAvailable && directDiffs.length > 0,
      results: analysisResults,
    });
  }, 'analyze transcripts')
);

// ---------------------------------------------------------------------------
// GET /api/voice-transcripts/dictionary — get the current corrections dictionary
// ---------------------------------------------------------------------------

voiceTranscriptAnalysisRouter.get(
  '/dictionary',
  asyncHandler(async (_req, res) => {
    const corrections = readCorrections();
    res.json({
      corrections,
      count: Object.keys(corrections).length,
      path: STT_CORRECTIONS_PATH,
    });
  }, 'get corrections dictionary')
);

// ---------------------------------------------------------------------------
// PUT /api/voice-transcripts/dictionary — update the corrections dictionary
// ---------------------------------------------------------------------------

voiceTranscriptAnalysisRouter.put(
  '/dictionary',
  asyncHandler(async (req, res) => {
    const { corrections: incoming } = req.body as { corrections?: CorrectionDictionary };
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Bad request', message: 'corrections object is required' });
      return;
    }

    saveCorrections(incoming);
    res.json({
      corrections: incoming,
      count: Object.keys(incoming).length,
    });
  }, 'update corrections dictionary')
);
