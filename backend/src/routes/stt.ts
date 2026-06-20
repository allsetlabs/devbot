import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { asyncHandler, sendBadRequest, sendInternalError } from '../lib/route-helpers.js';
import { ollamaGenerate, isOllamaAvailable, STT_CORRECTION_MODEL } from '../lib/ollama.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';
import { coreDb } from '../lib/db/core.js';
import { application_settings } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const sttRouter = Router();

const DEVBOT_DIR = path.join(DEVBOT_PROJECTS_DIR, '.devbot');
const STT_CORRECTIONS_PATH = path.join(DEVBOT_DIR, 'stt-corrections-dictionary.json');
const STT_MODEL_SETTING_KEY = 'stt.model';
const DEFAULT_STT_MODEL = 'tiny';
const STT_MODELS = ['tiny', 'small.en', 'small'] as const;
type SttModel = (typeof STT_MODELS)[number];
type CorrectionDictionary = Record<string, string[]>;

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function ensureDevbotDir(): void {
  if (!fs.existsSync(DEVBOT_DIR)) fs.mkdirSync(DEVBOT_DIR, { recursive: true });
}

function isSttModel(value: unknown): value is SttModel {
  return typeof value === 'string' && STT_MODELS.includes(value as SttModel);
}

function readSttModel(): SttModel {
  const rows = coreDb
    .select({ value: application_settings.value })
    .from(application_settings)
    .where(eq(application_settings.key, STT_MODEL_SETTING_KEY))
    .limit(1)
    .all();
  if (isSttModel(rows[0]?.value)) return rows[0].value;
  return DEFAULT_STT_MODEL;
}

function saveSttModel(model: SttModel): void {
  coreDb
    .insert(application_settings)
    .values({ key: STT_MODEL_SETTING_KEY, value: model })
    .onConflictDoUpdate({
      target: application_settings.key,
      set: { value: model, updated_by: 'user', updated_at: new Date().toISOString() },
    })
    .run();
}

// ---------------------------------------------------------------------------
// stt-corrections-dictionary.json helpers
// ---------------------------------------------------------------------------

function normalizeCorrections(value: unknown): CorrectionDictionary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized: CorrectionDictionary = {};
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry) && entry.every((variant) => typeof variant === 'string')) {
      normalized[key] = [...new Set(entry.map((variant) => variant.trim()).filter(Boolean))];
    } else if (typeof entry === 'string') {
      const correct = entry.trim();
      const variant = key.trim();
      if (correct && variant) normalized[correct] = [...(normalized[correct] ?? []), variant];
    }
  }
  return normalized;
}

function readCorrections(): CorrectionDictionary {
  try {
    if (fs.existsSync(STT_CORRECTIONS_PATH)) {
      return normalizeCorrections(JSON.parse(fs.readFileSync(STT_CORRECTIONS_PATH, 'utf8')));
    }
  } catch {
    // return empty on parse error
  }
  return {};
}

function saveCorrections(corrections: CorrectionDictionary): void {
  ensureDevbotDir();
  fs.writeFileSync(STT_CORRECTIONS_PATH, JSON.stringify(corrections, null, 2), 'utf8');
}

function mergeCorrections(
  existing: CorrectionDictionary,
  incoming: CorrectionDictionary
): CorrectionDictionary {
  const merged = { ...existing };
  for (const [correct, variants] of Object.entries(incoming)) {
    merged[correct] = [...new Set([...(merged[correct] ?? []), ...variants])];
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Whisper helpers
// ---------------------------------------------------------------------------

function commandSucceeds(command: string, args: string[], timeout = 5000): boolean {
  try {
    const result = spawnSync(command, args, { timeout });
    return result.status === 0;
  } catch {
    return false;
  }
}

function isSttAvailable(model: SttModel): boolean {
  return commandSucceeds('python3', [
    '-c',
    `import os, sys, whisper; from urllib.parse import urlparse; path=os.path.join(os.path.expanduser('~/.cache/whisper'), os.path.basename(urlparse(whisper._MODELS['${model}']).path)); sys.exit(0 if os.path.exists(path) else 1)`,
  ]);
}

function installSttModel(model: SttModel): { ok: boolean; error?: string } {
  const install = spawnSync(
    'python3',
    ['-c', `import whisper; whisper.load_model('${model}')`],
    { timeout: 600_000, encoding: 'utf8' }
  );
  return install.status === 0
    ? { ok: true }
    : { ok: false, error: install.stderr || install.stdout };
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
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Ollama correction pass
// ---------------------------------------------------------------------------

function buildCorrectionDictText(corrections: CorrectionDictionary): string {
  const entries = Object.entries(corrections);
  if (entries.length === 0) return '{}';
  return entries.map(([correct, variants]) => `"${correct}": ${JSON.stringify(variants)}`).join('\n');
}

async function applyOllamaCorrections(
  rawTranscript: string,
  corrections: CorrectionDictionary
): Promise<string> {
  const available = await isOllamaAvailable(STT_CORRECTION_MODEL);
  if (!available || rawTranscript.trim() === '') return rawTranscript;

  const prompt = `Correction dictionary:\n${buildCorrectionDictText(corrections)}\n\nRaw transcript:\n${rawTranscript}\n\nFinal cleaned text:`;

  try {
    const corrected = await ollamaGenerate(STT_CORRECTION_MODEL, prompt, 30_000);
    return corrected || rawTranscript;
  } catch (err) {
    console.error('[stt] ollama correction failed:', err);
    return rawTranscript;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/stt/status
sttRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const sttModel = readSttModel();
    const sttAvailable = isSttAvailable(sttModel);
    const ollamaAvailable = await isOllamaAvailable(STT_CORRECTION_MODEL);
    res.json({
      available: sttAvailable,
      model: sttModel,
      ollama: { available: ollamaAvailable, model: STT_CORRECTION_MODEL },
      correctionsCount: Object.keys(readCorrections()).length,
      dictionaryPath: STT_CORRECTIONS_PATH,
    });
  }, 'check stt status')
);

sttRouter.get(
  '/model',
  asyncHandler(async (_req, res) => {
    const selected = readSttModel();
    res.json({
      selected,
      models: STT_MODELS.map((id) => ({ id, installed: isSttAvailable(id) })),
    });
  }, 'get stt model')
);

sttRouter.put(
  '/model',
  asyncHandler(async (req, res) => {
    const { model } = req.body as { model?: unknown };
    if (!isSttModel(model)) return sendBadRequest(res, 'Unsupported STT model');
    saveSttModel(model);
    res.json({
      selected: model,
      models: STT_MODELS.map((id) => ({ id, installed: isSttAvailable(id) })),
    });
  }, 'select stt model')
);

sttRouter.post(
  '/model/install',
  asyncHandler(async (req, res) => {
    const { model } = req.body as { model?: unknown };
    if (!isSttModel(model)) return sendBadRequest(res, 'Unsupported STT model');
    const result = installSttModel(model);
    if (!result.ok) return sendInternalError(res, result.error, `install STT model ${model}`);
    res.json({ installed: true, model });
  }, 'install stt model')
);

// POST /api/stt/transcribe — receive audio blob, run whisper, apply Ollama corrections
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

      const sttModel = readSttModel();
      const result = spawnSync(
        'python3',
        [
          '-m', 'whisper', wavPath,
          '--model', sttModel,
          '--output_format', 'json',
          '--output_dir', os.tmpdir(),
          '--verbose', 'False',
          '--fp16', 'False',
        ],
        { timeout: 120_000, encoding: 'utf8' }
      );

      if (result.status !== 0) {
        console.error('[stt] whisper error:', result.stderr);
        return sendInternalError(res, result.stderr, 'transcribe audio');
      }

      let rawTranscript = '';
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        rawTranscript = (parsed.text ?? '').trim();
      }

      const corrections = readCorrections();
      const transcript = await applyOllamaCorrections(rawTranscript, corrections);

      res.json({ transcript, rawTranscript });
    } finally {
      cleanup(req.file.path, wavPath, jsonPath);
    }
  }, 'transcribe audio')
);

// POST /api/stt/learn — compare STT output vs user edit; update stt-corrections-dictionary.json via Ollama
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

    const ollamaAvailable = await isOllamaAvailable(STT_CORRECTION_MODEL);
    if (!ollamaAvailable) {
      res.json({ learned: false, reason: 'ollama_unavailable', model: STT_CORRECTION_MODEL });
      return;
    }

    const prompt = `You are analyzing speech-to-text corrections to build a vocabulary correction dictionary.

STT output: "${sttOutput}"
User's corrected version: "${finalMessage}"

Identify only genuine speech-to-text errors — words or phrases the STT misheard. Ignore cases where the user simply added more text, changed their mind, or rephrased intentionally.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasCorrections": boolean,
  "replacements": {"correct phrase": ["misheard variant"]},
  "summary": "one-line description"
}`;

    try {
      const output = await ollamaGenerate(STT_CORRECTION_MODEL, prompt, 30_000);
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.json({ learned: false, reason: 'parse_error' });
        return;
      }

      const analysis = JSON.parse(jsonMatch[0]) as {
        hasCorrections: boolean;
        replacements: CorrectionDictionary;
        summary: string;
      };

      if (
        !analysis.hasCorrections ||
        !analysis.replacements ||
        Object.keys(analysis.replacements).length === 0
      ) {
        res.json({ learned: false, reason: 'no_corrections_identified' });
        return;
      }

      const existing = readCorrections();
      const merged = mergeCorrections(existing, analysis.replacements);
      saveCorrections(merged);

      res.json({
        learned: true,
        replacements: analysis.replacements,
        summary: analysis.summary,
        totalCorrections: Object.keys(merged).length,
      });
    } catch (err) {
      console.error('[stt] learn error:', err);
      res.json({ learned: false, reason: 'error' });
    }
  }, 'learn stt correction')
);

// GET /api/stt/corrections — view the current corrections dictionary
sttRouter.get(
  '/corrections',
  asyncHandler(async (_req, res) => {
    const corrections = readCorrections();
    res.json({ corrections, count: Object.keys(corrections).length, path: STT_CORRECTIONS_PATH });
  }, 'get stt corrections')
);

// PUT /api/stt/corrections — manually add or update correction entries
sttRouter.put(
  '/corrections',
  asyncHandler(async (req, res) => {
    const { replacements } = req.body as { replacements?: CorrectionDictionary };
    if (!replacements || typeof replacements !== 'object') {
      return sendBadRequest(res, 'replacements object is required');
    }
    const existing = readCorrections();
    const merged = mergeCorrections(existing, normalizeCorrections(replacements));
    saveCorrections(merged);
    res.json({ corrections: merged, count: Object.keys(merged).length });
  }, 'update stt corrections')
);
