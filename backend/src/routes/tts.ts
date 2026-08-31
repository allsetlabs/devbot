import { Router } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import { asyncHandler, sendBadRequest, sendInternalError } from '../lib/route-helpers.js';
import { coreDb } from '../lib/db/core.js';
import { application_settings } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const ttsRouter = Router();

const TTS_VOICE_SETTING_KEY = 'tts.voice';
const DEFAULT_TTS_VOICE = 'en-US-AndrewMultilingualNeural';

// ---------------------------------------------------------------------------
// Voice setting helpers
// ---------------------------------------------------------------------------

function readTtsVoice(): string {
  const rows = coreDb
    .select({ value: application_settings.value })
    .from(application_settings)
    .where(eq(application_settings.key, TTS_VOICE_SETTING_KEY))
    .limit(1)
    .all();
  return rows[0]?.value || DEFAULT_TTS_VOICE;
}

function saveTtsVoice(voice: string): void {
  coreDb
    .insert(application_settings)
    .values({ key: TTS_VOICE_SETTING_KEY, value: voice })
    .onConflictDoUpdate({
      target: application_settings.key,
      set: { value: voice, updated_by: 'user', updated_at: new Date().toISOString() },
    })
    .run();
}

// ---------------------------------------------------------------------------
// Voices cache
// ---------------------------------------------------------------------------

interface VoiceInfo {
  id: string;
  gender: string;
  locale: string;
}

let cachedVoices: VoiceInfo[] | null = null;

// ---------------------------------------------------------------------------
// Temp file cleanup
// ---------------------------------------------------------------------------

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/tts/status — check if edge-tts is available
ttsRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    let available = false;
    try {
      const result = spawnSync('python3', ['-c', "import edge_tts; print('ok')"], {
        timeout: 5000,
        encoding: 'utf8',
      });
      available = result.status === 0 && result.stdout.trim() === 'ok';
    } catch {
      available = false;
    }
    const voice = readTtsVoice();
    res.json({ available, voice });
  }, 'check tts status')
);

// GET /api/tts/voices — list available voices
ttsRouter.get(
  '/voices',
  asyncHandler(async (_req, res) => {
    if (cachedVoices) {
      res.json({ voices: cachedVoices });
      return;
    }

    const script = `import asyncio, edge_tts
voices = asyncio.run(edge_tts.list_voices())
for v in voices:
    print(v['ShortName'] + '|' + v['Gender'] + '|' + v['Locale'])`;

    const result = spawnSync('python3', ['-c', script], {
      timeout: 15000,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      return sendInternalError(res, result.stderr, 'list TTS voices');
    }

    const voices: VoiceInfo[] = result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [id, gender, locale] = line.split('|');
        return { id, gender, locale };
      });

    cachedVoices = voices;
    res.json({ voices });
  }, 'list tts voices')
);

// PUT /api/tts/voice — select the TTS voice
ttsRouter.put(
  '/voice',
  asyncHandler(async (req, res) => {
    const { voice } = req.body as { voice?: string };
    if (!voice || typeof voice !== 'string' || voice.trim().length === 0) {
      return sendBadRequest(res, 'voice is required');
    }
    saveTtsVoice(voice.trim());
    res.json({ voice: voice.trim() });
  }, 'select tts voice')
);

// POST /api/tts/synthesize — convert text to speech
ttsRouter.post(
  '/synthesize',
  asyncHandler(async (req, res) => {
    const { text, voice: reqVoice } = req.body as { text?: string; voice?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return sendBadRequest(res, 'text is required');
    }

    const voice = reqVoice?.trim() || readTtsVoice();
    const outputPath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);

    // Escape single quotes in text and voice for safe embedding in Python string
    const safeText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeVoice = voice.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const script = `import asyncio, edge_tts
asyncio.run(edge_tts.Communicate('${safeText}', '${safeVoice}').save('${outputPath}'))`;

    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('python3', ['-c', script], {
          timeout: 30_000,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';
        proc.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(stderr || `edge-tts exited with code ${code}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

      if (!fs.existsSync(outputPath)) {
        return sendInternalError(res, 'Output file not created', 'synthesize speech');
      }

      const stat = fs.statSync(outputPath);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);

      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => cleanup(outputPath));
      stream.on('error', () => cleanup(outputPath));
    } catch (err) {
      cleanup(outputPath);
      return sendInternalError(res, err, 'synthesize speech');
    }
  }, 'synthesize speech')
);

// POST /api/tts/synthesize-stream — SSE streaming version (aliases to /synthesize for now)
ttsRouter.post(
  '/synthesize-stream',
  asyncHandler(async (req, res) => {
    const { text, voice: reqVoice } = req.body as { text?: string; voice?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return sendBadRequest(res, 'text is required');
    }

    const voice = reqVoice?.trim() || readTtsVoice();
    const outputPath = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);

    const safeText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeVoice = voice.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const script = `import asyncio, edge_tts
asyncio.run(edge_tts.Communicate('${safeText}', '${safeVoice}').save('${outputPath}'))`;

    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('python3', ['-c', script], {
          timeout: 30_000,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';
        proc.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(stderr || `edge-tts exited with code ${code}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

      if (!fs.existsSync(outputPath)) {
        return sendInternalError(res, 'Output file not created', 'synthesize speech (stream)');
      }

      const stat = fs.statSync(outputPath);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);

      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('end', () => cleanup(outputPath));
      stream.on('error', () => cleanup(outputPath));
    } catch (err) {
      cleanup(outputPath);
      return sendInternalError(res, err, 'synthesize speech (stream)');
    }
  }, 'synthesize speech stream')
);
