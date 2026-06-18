import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { asyncHandler, sendBadRequest, sendInternalError } from '../lib/route-helpers.js';
import { spawnClaude } from '../lib/claude-spawn.js';

export const sttRouter = Router();

const STT_LEARNING_PATH = path.join(os.homedir(), '.devbot', 'stt-learning.md');
const WHISPER_MODEL = 'tiny';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function ensureLearningDir(): void {
  const dir = path.dirname(STT_LEARNING_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLearning(): string {
  try {
    return fs.existsSync(STT_LEARNING_PATH) ? fs.readFileSync(STT_LEARNING_PATH, 'utf8') : '';
  } catch {
    return '';
  }
}

/** Extract vocabulary hints from learning entries to use as whisper initial_prompt */
function buildInitialPrompt(learning: string): string {
  const correctedPhrases: string[] = [];
  const lines = learning.split('\n');
  for (const line of lines) {
    const match = line.match(/^\*\*User sent:\*\*\s*(.+)/);
    if (match) correctedPhrases.push(match[1].trim());
  }
  return [...new Set(correctedPhrases)].slice(-20).join('. ');
}

function isWhisperAvailable(): boolean {
  try {
    const result = spawnSync('python3', ['-c', 'import whisper'], { timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

function convertToWav(inputPath: string, outputPath: string): boolean {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', outputPath],
    { timeout: 30_000 }
  );
  return result.status === 0;
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore cleanup errors
    }
  }
}

// GET /api/stt/status
sttRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const available = isWhisperAvailable();
    res.json({ available, model: available ? WHISPER_MODEL : null });
  }, 'check stt status')
);

// POST /api/stt/transcribe — receive audio blob, run local whisper, return transcript
sttRouter.post(
  '/transcribe',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file) return sendBadRequest(res, 'No audio file provided');

    const wavPath = path.join(os.tmpdir(), `stt-${Date.now()}.wav`);
    const baseName = path.basename(wavPath, '.wav');
    const jsonPath = path.join(os.tmpdir(), `${baseName}.json`);

    try {
      if (!convertToWav(req.file.path, wavPath)) {
        return sendBadRequest(res, 'Failed to convert audio to WAV');
      }

      const learning = readLearning();
      const initialPrompt = buildInitialPrompt(learning);

      const args = [
        '-m',
        'whisper',
        wavPath,
        '--model',
        WHISPER_MODEL,
        '--output_format',
        'json',
        '--output_dir',
        os.tmpdir(),
        '--verbose',
        'False',
        '--fp16',
        'False',
      ];
      if (initialPrompt) args.push('--initial_prompt', initialPrompt);

      const result = spawnSync('python3', args, { timeout: 120_000, encoding: 'utf8' });

      if (result.status !== 0) {
        console.error('[stt] whisper error:', result.stderr);
        return sendInternalError(res, result.stderr, 'transcribe audio');
      }

      let transcript = '';
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        transcript = (parsed.text ?? '').trim();
      }

      res.json({ transcript });
    } finally {
      cleanup(req.file.path, wavPath, jsonPath);
    }
  }, 'transcribe audio')
);

// POST /api/stt/learn — compare STT output vs what user actually sent; update learning file
sttRouter.post(
  '/learn',
  asyncHandler(async (req, res) => {
    const { sttOutput, finalMessage } = req.body as {
      sttOutput?: string;
      finalMessage?: string;
    };

    if (!sttOutput || !finalMessage) {
      return sendBadRequest(res, 'sttOutput and finalMessage are required');
    }

    if (sttOutput.trim() === finalMessage.trim()) {
      res.json({ learned: false, reason: 'no_correction' });
      return;
    }

    const prompt = `You are analyzing speech-to-text corrections to improve future transcriptions.

STT output: "${sttOutput}"
User's final message: "${finalMessage}"

Determine if the user corrected genuine speech-to-text errors (misheard words/phrases), or if they simply added more text, changed meaning, or rewrote for other reasons.

Only report as corrections when the STT clearly misheard a specific word or phrase.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasCorrections": boolean,
  "corrections": [{"wrong": "word STT got wrong", "correct": "what it should have been"}],
  "summary": "one-line description of what was corrected"
}`;

    const spawnResult = spawnClaude({
      prompt,
      model: 'haiku',
      returnOutput: true,
      timeoutMs: 30_000,
    });

    try {
      const output = (await spawnResult.output) ?? '';
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.json({ learned: false, reason: 'parse_error' });
        return;
      }

      const analysis = JSON.parse(jsonMatch[0]) as {
        hasCorrections: boolean;
        corrections: { wrong: string; correct: string }[];
        summary: string;
      };

      if (!analysis.hasCorrections || !analysis.corrections?.length) {
        res.json({ learned: false, reason: 'no_corrections_identified' });
        return;
      }

      ensureLearningDir();
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const entry = [
        `\n### ${timestamp}`,
        `**STT output:** ${sttOutput}`,
        `**User sent:** ${finalMessage}`,
        `**Summary:** ${analysis.summary}`,
        `**Corrections:**`,
        ...analysis.corrections.map((c) => `- "${c.wrong}" → "${c.correct}"`),
        '',
      ].join('\n');

      const existing = readLearning();
      if (!existing) {
        const header = [
          '# STT User Learning',
          '',
          'This file is automatically maintained to improve speech-to-text accuracy.',
          'It is referenced before every voice transcription as vocabulary hints for the whisper model.',
          '',
          '## Learning Entries',
        ].join('\n');
        fs.writeFileSync(STT_LEARNING_PATH, header + entry, 'utf8');
      } else {
        fs.appendFileSync(STT_LEARNING_PATH, entry, 'utf8');
      }

      res.json({ learned: true, corrections: analysis.corrections, summary: analysis.summary });
    } catch (err) {
      console.error('[stt] learn error:', err);
      res.json({ learned: false, reason: 'error' });
    }
  }, 'learn stt correction')
);
