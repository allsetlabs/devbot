import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import {
  asyncHandler,
  sendBadRequest,
  sendInternalError,
} from '../lib/route-helpers.js';
import {
  isOllamaRunning,
  ollamaListModels,
  ollamaShowModel,
  ollamaPullModel,
  ollamaDeleteModel,
  ollamaCreateModel,
  ollamaGenerateFull,
  ollamaChat,
  getOllamaBaseUrl,
  STT_CORRECTION_MODEL,
} from '../lib/ollama.js';
import { DEVBOT_PROJECTS_DIR } from '../lib/env.js';
import type { OllamaChatMessage } from '../lib/ollama.js';

export const localModelsRouter = Router();

// ---------------------------------------------------------------------------
// Custom model storage
// ---------------------------------------------------------------------------

const CUSTOM_MODELS_DIR = path.join(DEVBOT_PROJECTS_DIR, '.data', 'local-models');
const CUSTOM_MODELS_FILE = path.join(CUSTOM_MODELS_DIR, 'custom-models.json');

interface CustomModelDef {
  name: string;
  baseModel: string;
  systemPrompt: string;
  parameters: Record<string, unknown>;
  inheritDictionary: boolean;
  createdAt: string;
  updatedAt: string;
}

function ensureCustomModelsDir(): void {
  if (!fs.existsSync(CUSTOM_MODELS_DIR)) fs.mkdirSync(CUSTOM_MODELS_DIR, { recursive: true });
}

function readCustomModels(): CustomModelDef[] {
  try {
    if (fs.existsSync(CUSTOM_MODELS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_MODELS_FILE, 'utf8')) as CustomModelDef[];
    }
  } catch {
    // return empty on parse error
  }
  return [];
}

function saveCustomModels(models: CustomModelDef[]): void {
  ensureCustomModelsDir();
  fs.writeFileSync(CUSTOM_MODELS_FILE, JSON.stringify(models, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// STT corrections dictionary (shared with stt.ts)
// ---------------------------------------------------------------------------

const DEVBOT_DIR = path.join(DEVBOT_PROJECTS_DIR, '.devbot');
const STT_CORRECTIONS_PATH = path.join(DEVBOT_DIR, 'stt-corrections-dictionary.json');

function readCorrections(): Record<string, string[]> {
  try {
    if (fs.existsSync(STT_CORRECTIONS_PATH)) {
      return JSON.parse(fs.readFileSync(STT_CORRECTIONS_PATH, 'utf8'));
    }
  } catch {
    // return empty
  }
  return {};
}

// ---------------------------------------------------------------------------
// Recommended models catalog
// ---------------------------------------------------------------------------

const RECOMMENDED_MODELS = [
  {
    name: 'qwen3:0.6b',
    displayName: 'Qwen 3 0.6B',
    description: 'Ultra-fast, tiny model for simple tasks — text cleanup, classification, extraction',
    size: '0.6B parameters',
    category: 'fast' as const,
    useCases: ['STT correction', 'text classification', 'simple extraction', 'quick formatting'],
  },
  {
    name: 'qwen3:1.7b',
    displayName: 'Qwen 3 1.7B',
    description: 'Fast and capable small model — good balance of speed and intelligence',
    size: '1.7B parameters',
    category: 'balanced' as const,
    useCases: ['summarization', 'code review', 'translation', 'Q&A'],
  },
  {
    name: 'qwen3:4b',
    displayName: 'Qwen 3 4B',
    description: 'Capable mid-size model for more complex reasoning tasks',
    size: '4B parameters',
    category: 'capable' as const,
    useCases: ['code generation', 'analysis', 'creative writing', 'complex extraction'],
  },
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    description: 'Meta\'s compact model — solid general-purpose performance',
    size: '3B parameters',
    category: 'balanced' as const,
    useCases: ['general chat', 'code help', 'summarization'],
  },
  {
    name: 'gemma3:4b',
    displayName: 'Gemma 3 4B',
    description: 'Google\'s efficient model — strong at instruction following',
    size: '4B parameters',
    category: 'capable' as const,
    useCases: ['instruction following', 'structured output', 'analysis'],
  },
  {
    name: 'phi4-mini',
    displayName: 'Phi 4 Mini',
    description: 'Microsoft\'s small powerhouse — punches above its weight',
    size: '3.8B parameters',
    category: 'balanced' as const,
    useCases: ['math', 'reasoning', 'code', 'science'],
  },
];

// ---------------------------------------------------------------------------
// Helper: format bytes to human-readable
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/local-models/status — Ollama connection status + summary
localModelsRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const running = await isOllamaRunning();
    let modelCount = 0;
    let models: string[] = [];
    if (running) {
      try {
        const list = await ollamaListModels();
        modelCount = list.length;
        models = list.map((m) => m.name);
      } catch {
        // failed to list models
      }
    }
    res.json({
      running,
      baseUrl: getOllamaBaseUrl(),
      modelCount,
      models,
      sttCorrectionModel: STT_CORRECTION_MODEL,
      customModelsCount: readCustomModels().length,
    });
  }, 'check ollama status')
);

// GET /api/local-models — List all pulled models with details
localModelsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const running = await isOllamaRunning();
    if (!running) {
      res.json({ running: false, models: [] });
      return;
    }

    const models = await ollamaListModels();
    const customModels = readCustomModels();
    const customNames = new Set(customModels.map((c) => c.name));

    const enriched = models.map((m) => ({
      name: m.name,
      size: m.size,
      sizeHuman: formatBytes(m.size),
      modifiedAt: m.modified_at,
      digest: m.digest.slice(0, 12),
      family: m.details.family,
      parameterSize: m.details.parameter_size,
      quantization: m.details.quantization_level,
      isCustom: customNames.has(m.name),
      isSttModel: m.name === STT_CORRECTION_MODEL || m.name.startsWith(STT_CORRECTION_MODEL),
    }));

    res.json({ running: true, models: enriched });
  }, 'list local models')
);

// GET /api/local-models/recommended — List recommended models to pull
localModelsRouter.get(
  '/recommended',
  asyncHandler(async (_req, res) => {
    let pulledNames: string[] = [];
    try {
      const running = await isOllamaRunning();
      if (running) {
        const models = await ollamaListModels();
        pulledNames = models.map((m) => m.name);
      }
    } catch {
      // ignore
    }

    const enriched = RECOMMENDED_MODELS.map((r) => ({
      ...r,
      pulled: pulledNames.some((p) => p === r.name || p.startsWith(r.name.split(':')[0])),
    }));

    res.json({ recommended: enriched });
  }, 'list recommended models')
);

// GET /api/local-models/custom — List custom model definitions
localModelsRouter.get(
  '/custom',
  asyncHandler(async (_req, res) => {
    const customs = readCustomModels();
    res.json({ customModels: customs });
  }, 'list custom models')
);

// GET /api/local-models/dictionary — Get the shared corrections dictionary
// (must be above the /:name(*) wildcard)
localModelsRouter.get(
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

// GET /api/local-models/:name — Get model details
// IMPORTANT: must be LAST among GET routes — wildcard catches everything
localModelsRouter.get(
  '/:name(*)',
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    if (!name) return sendBadRequest(res, 'Model name is required');

    try {
      const detail = await ollamaShowModel(name);
      const customs = readCustomModels();
      const customDef = customs.find((c) => c.name === name);

      res.json({
        name,
        ...detail,
        isCustom: !!customDef,
        customDef: customDef ?? null,
      });
    } catch (err) {
      sendInternalError(res, err, `show model ${name}`);
    }
  }, 'show model details')
);

// POST /api/local-models/pull — Pull a model from registry
localModelsRouter.post(
  '/pull',
  asyncHandler(async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string') return sendBadRequest(res, 'Model name is required');

    try {
      // Use non-streaming pull — simpler for REST API
      await ollamaPullModel(name);
      res.json({ success: true, name, message: `Model ${name} pulled successfully` });
    } catch (err) {
      sendInternalError(res, err, `pull model ${name}`);
    }
  }, 'pull model')
);

// DELETE /api/local-models/:name — Delete a model
localModelsRouter.delete(
  '/:name(*)',
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    if (!name) return sendBadRequest(res, 'Model name is required');

    try {
      await ollamaDeleteModel(name);

      // Also remove from custom models if it was custom
      const customs = readCustomModels();
      const filtered = customs.filter((c) => c.name !== name);
      if (filtered.length !== customs.length) {
        saveCustomModels(filtered);
      }

      res.json({ success: true, name, message: `Model ${name} deleted` });
    } catch (err) {
      sendInternalError(res, err, `delete model ${name}`);
    }
  }, 'delete model')
);

// POST /api/local-models/generate — Run text generation
localModelsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { model, prompt, system, temperature, maxTokens } = req.body as {
      model?: string;
      prompt?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
    };
    if (!model || !prompt) return sendBadRequest(res, 'model and prompt are required');

    try {
      const result = await ollamaGenerateFull(
        model,
        prompt,
        {
          temperature: temperature ?? undefined,
          num_predict: maxTokens ?? undefined,
          system: system ?? undefined,
        },
        120_000
      );

      res.json({
        response: result.response.trim(),
        model: result.model,
        done: result.done,
        metrics: {
          totalDurationMs: result.total_duration ? Math.round(result.total_duration / 1e6) : null,
          evalCount: result.eval_count ?? null,
          evalDurationMs: result.eval_duration ? Math.round(result.eval_duration / 1e6) : null,
          promptEvalCount: result.prompt_eval_count ?? null,
          tokensPerSecond:
            result.eval_count && result.eval_duration
              ? Math.round((result.eval_count / (result.eval_duration / 1e9)) * 10) / 10
              : null,
        },
      });
    } catch (err) {
      sendInternalError(res, err, 'generate text');
    }
  }, 'generate text')
);

// POST /api/local-models/chat — Chat completion
localModelsRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { model, messages, temperature, maxTokens } = req.body as {
      model?: string;
      messages?: OllamaChatMessage[];
      temperature?: number;
      maxTokens?: number;
    };
    if (!model || !messages || !Array.isArray(messages)) {
      return sendBadRequest(res, 'model and messages array are required');
    }

    try {
      const result = await ollamaChat(
        model,
        messages,
        {
          temperature: temperature ?? undefined,
          num_predict: maxTokens ?? undefined,
        },
        120_000
      );

      res.json({
        message: result.message,
        model: result.model,
        done: result.done,
        metrics: {
          totalDurationMs: result.total_duration ? Math.round(result.total_duration / 1e6) : null,
          evalCount: result.eval_count ?? null,
          evalDurationMs: result.eval_duration ? Math.round(result.eval_duration / 1e6) : null,
          promptEvalCount: result.prompt_eval_count ?? null,
          tokensPerSecond:
            result.eval_count && result.eval_duration
              ? Math.round((result.eval_count / (result.eval_duration / 1e9)) * 10) / 10
              : null,
        },
      });
    } catch (err) {
      sendInternalError(res, err, 'chat completion');
    }
  }, 'chat completion')
);

// POST /api/local-models/custom — Create a custom model
localModelsRouter.post(
  '/custom',
  asyncHandler(async (req, res) => {
    const { name, baseModel, systemPrompt, parameters, inheritDictionary } = req.body as {
      name?: string;
      baseModel?: string;
      systemPrompt?: string;
      parameters?: Record<string, unknown>;
      inheritDictionary?: boolean;
    };

    if (!name || !baseModel || !systemPrompt) {
      return sendBadRequest(res, 'name, baseModel, and systemPrompt are required');
    }

    // Build the Modelfile
    let modelfile = `FROM ${baseModel}\n\n`;

    // Add parameters
    const params = parameters ?? {};
    if (params.temperature !== undefined) modelfile += `PARAMETER temperature ${params.temperature}\n`;
    if (params.num_predict !== undefined) modelfile += `PARAMETER num_predict ${params.num_predict}\n`;
    if (params.top_p !== undefined) modelfile += `PARAMETER top_p ${params.top_p}\n`;
    if (params.top_k !== undefined) modelfile += `PARAMETER top_k ${params.top_k}\n`;

    // Optionally inherit the STT corrections dictionary into the system prompt
    let fullSystemPrompt = systemPrompt;
    if (inheritDictionary) {
      const corrections = readCorrections();
      if (Object.keys(corrections).length > 0) {
        const dictEntries = Object.entries(corrections)
          .map(([correct, variants]) => `  "${correct}": ${JSON.stringify(variants)}`)
          .join('\n');
        fullSystemPrompt += `\n\n<CUSTOM_DICTIONARY>\nThe following correction dictionary maps correct terms to commonly misheard variants:\n${dictEntries}\n</CUSTOM_DICTIONARY>`;
      }
    }

    modelfile += `\nSYSTEM """${fullSystemPrompt}"""\n`;

    try {
      await ollamaCreateModel(name, modelfile);

      // Save custom model definition
      const customs = readCustomModels();
      const existing = customs.findIndex((c) => c.name === name);
      const now = new Date().toISOString();
      const def: CustomModelDef = {
        name,
        baseModel,
        systemPrompt,
        parameters: params,
        inheritDictionary: !!inheritDictionary,
        createdAt: existing >= 0 ? customs[existing].createdAt : now,
        updatedAt: now,
      };
      if (existing >= 0) {
        customs[existing] = def;
      } else {
        customs.push(def);
      }
      saveCustomModels(customs);

      res.json({ success: true, name, message: `Custom model ${name} created`, modelfile });
    } catch (err) {
      sendInternalError(res, err, `create custom model ${name}`);
    }
  }, 'create custom model')
);

