const OLLAMA_BASE = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
export const STT_CORRECTION_MODEL = process.env.OLLAMA_STT_MODEL ?? 'transcript-cleaner';

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
    const data = (await resp.json()) as { response: string };
    return data.response.trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function isOllamaAvailable(model: string): Promise<boolean> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { models: { name: string }[] };
    const base = model.split(':')[0];
    return data.models.some((m) => m.name === model || m.name.startsWith(base));
  } catch {
    return false;
  }
}
