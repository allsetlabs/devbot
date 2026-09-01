const OLLAMA_BASE = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
export const STT_CORRECTION_MODEL = process.env.OLLAMA_STT_MODEL ?? 'transcript-cleaner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelDetail {
  modelfile: string;
  parameters: string;
  template: string;
  details: OllamaModelInfo['details'];
  model_info?: Record<string, unknown>;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  prompt_eval_count?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  prompt_eval_count?: number;
}

// ---------------------------------------------------------------------------
// Core: generate (existing)
// ---------------------------------------------------------------------------

export async function ollamaGenerate(
  model: string,
  prompt: string,
  timeoutMs = 60_000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
    const data = (await resp.json()) as OllamaGenerateResponse;
    return data.response.trim();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core: generate with full response (includes timing metrics)
// ---------------------------------------------------------------------------

export async function ollamaGenerateFull(
  model: string,
  prompt: string,
  options?: { temperature?: number; num_predict?: number; system?: string },
  timeoutMs = 60_000
): Promise<OllamaGenerateResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = { model, prompt, stream: false };
    if (options) {
      const opts: Record<string, unknown> = {};
      if (options.temperature !== undefined) opts.temperature = options.temperature;
      if (options.num_predict !== undefined) opts.num_predict = options.num_predict;
      if (Object.keys(opts).length > 0) body.options = opts;
      if (options.system) body.system = options.system;
    }
    const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
    return (await resp.json()) as OllamaGenerateResponse;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core: chat completion
// ---------------------------------------------------------------------------

export async function ollamaChat(
  model: string,
  messages: OllamaChatMessage[],
  options?: { temperature?: number; num_predict?: number },
  timeoutMs = 120_000
): Promise<OllamaChatResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = { model, messages, stream: false };
    if (options) {
      const opts: Record<string, unknown> = {};
      if (options.temperature !== undefined) opts.temperature = options.temperature;
      if (options.num_predict !== undefined) opts.num_predict = options.num_predict;
      if (Object.keys(opts).length > 0) body.options = opts;
    }
    const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
    return (await resp.json()) as OllamaChatResponse;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Model availability (existing)
// ---------------------------------------------------------------------------

export async function isOllamaAvailable(model: string): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { models: OllamaModelInfo[] };
    const base = model.split(':')[0];
    return data.models.some((m) => m.name === model || m.name.startsWith(base));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------

export async function isOllamaRunning(): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Model management
// ---------------------------------------------------------------------------

/** List all locally pulled models */
export async function ollamaListModels(): Promise<OllamaModelInfo[]> {
  const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
  const data = (await resp.json()) as { models: OllamaModelInfo[] };
  return data.models ?? [];
}

/** Get detailed info about a specific model */
export async function ollamaShowModel(name: string): Promise<OllamaModelDetail> {
  const resp = await fetch(`${OLLAMA_BASE}/api/show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
  return (await resp.json()) as OllamaModelDetail;
}

/** Pull a model from the Ollama registry (streaming progress) */
export async function ollamaPullModel(
  name: string,
  onProgress?: (status: string, completed?: number, total?: number) => void
): Promise<void> {
  const resp = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, stream: !!onProgress }),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);

  if (onProgress && resp.body) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as {
            status: string;
            completed?: number;
            total?: number;
          };
          onProgress(data.status, data.completed, data.total);
        } catch {
          // skip malformed lines
        }
      }
    }
  } else {
    await resp.json(); // consume body
  }
}

/** Delete a model from local storage */
export async function ollamaDeleteModel(name: string): Promise<void> {
  const resp = await fetch(`${OLLAMA_BASE}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
}

/** Create a custom model from a Modelfile */
export async function ollamaCreateModel(
  name: string,
  modelfile: string
): Promise<void> {
  const resp = await fetch(`${OLLAMA_BASE}/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, modelfile, stream: false }),
  });
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
  // Consume the response body (streaming JSON lines even with stream:false)
  if (resp.body) {
    const reader = resp.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  }
}

/** Get the configured Ollama base URL */
export function getOllamaBaseUrl(): string {
  return OLLAMA_BASE;
}
