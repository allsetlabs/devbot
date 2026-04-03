import { spawn, ChildProcess } from 'child_process';
import { parseStreamLine, type StreamParserConfig } from './stream-parser.js';

export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';
export type PermissionMode = 'plan' | 'auto-accept' | 'dangerous';

/** Map short model names to Claude CLI model IDs */
export const MODEL_ID_MAP: Record<ClaudeModel, string> = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};

/** Shared map of running executions (key -> ChildProcess) */
const runningExecutions = new Map<string, ChildProcess>();

export function isExecuting(key: string): boolean {
  return runningExecutions.has(key);
}

export function stopExecution(key: string): boolean {
  const proc = runningExecutions.get(key);
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
    runningExecutions.delete(key);
    return true;
  }
  return false;
}

export function registerExecution(key: string, proc: ChildProcess): void {
  runningExecutions.set(key, proc);
}

export function unregisterExecution(key: string): void {
  runningExecutions.delete(key);
}

export interface ClaudeSpawnOptions {
  /** User prompt to send */
  prompt: string;
  /** Model selection (defaults to 'sonnet') */
  model?: ClaudeModel;
  /** System prompts appended via --append-system-prompt (applied in order) */
  systemPrompts?: string[];
  /** Resume an existing Claude session */
  sessionId?: string;
  /** Max agentic turns */
  maxTurns?: number;
  /** Working directory (defaults to CLAUDE_WORK_DIR || cwd) */
  workDir?: string;
  /** Enable --chrome flag (default: false) */
  chrome?: boolean;
  /** Timeout in ms (default: 30_000) */
  timeoutMs?: number;
  /** Suffix appended to prompt text */
  promptSuffix?: string;
  /** If provided, messages are persisted to DB via stream-parser */
  persist?: StreamParserConfig & { initialSequence?: number };
  /** Track process in the shared runningExecutions map under this key */
  trackAs?: string;
  /** Wait for process to complete and return the final text output */
  returnOutput?: boolean;
  /** JSON schema for structured output (implies returnOutput) */
  outputSchema?: { name: string; schema: Record<string, unknown> };
  /** Callback when session ID is captured from stream */
  onSessionId?: (sessionId: string) => void;
  /** Callback on process exit */
  onComplete?: (exitCode: number | null, success: boolean) => void;
  /** Raw stdout data callback (for JSONL file backup etc.) */
  onRawChunk?: (chunk: string) => void;
}

export interface ClaudeSpawnResult {
  /** The spawned child process */
  process: ChildProcess;
  /** Present when returnOutput/outputSchema — resolves with final text */
  output?: Promise<string>;
  /** Present when outputSchema — resolves with parsed JSON */
  structured?: Promise<unknown>;
  /** Resolves when the process exits with exit code */
  done: Promise<number | null>;
  /** Kill the process */
  kill: () => void;
}

/** Extract the first JSON object or array from text, handling markdown fences */
function extractJson(text: string): string {
  // Strip markdown JSON fences
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const source = fenced ? fenced[1].trim() : text.trim();

  // Find first { or [
  const objStart = source.indexOf('{');
  const arrStart = source.indexOf('[');
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) return source;

  const opener = source[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === opener) depth++;
    if (source[i] === closer) depth--;
    if (depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

/**
 * Unified Claude CLI spawn API.
 * Spawns a Claude Code CLI process with the given options and returns immediately.
 */
export function spawnClaude(options: ClaudeSpawnOptions): ClaudeSpawnResult {
  const {
    model = 'sonnet',
    systemPrompts = [],
    sessionId,
    maxTurns,
    workDir = process.env.CLAUDE_WORK_DIR || process.cwd(),
    chrome = false,
    timeoutMs = 30_000,
    promptSuffix,
    persist,
    trackAs,
    returnOutput = false,
    outputSchema,
    onSessionId,
    onComplete,
    onRawChunk,
  } = options;

  // Build the final prompt
  let finalPrompt = options.prompt;
  if (outputSchema) {
    finalPrompt += `\n\nYou MUST respond with ONLY a valid JSON object matching this schema (no markdown fences, no explanation, no preamble):\n${JSON.stringify(outputSchema.schema, null, 2)}`;
  }
  if (promptSuffix) {
    finalPrompt += promptSuffix;
  }

  // Build args
  const args: string[] = [
    '-p',
    finalPrompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    MODEL_ID_MAP[model],
    '--dangerously-skip-permissions',
  ];

  if (chrome) args.push('--chrome');
  if (sessionId) args.push('--resume', sessionId);
  if (maxTurns && maxTurns > 0) args.push('--max-turns', String(maxTurns));
  for (const sp of systemPrompts) {
    args.push('--append-system-prompt', sp);
  }

  // Spawn
  const proc = spawn('claude', args, {
    cwd: workDir,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Track
  if (trackAs) runningExecutions.set(trackAs, proc);

  // State
  const wantsOutput = returnOutput || !!outputSchema;
  let buffer = '';
  let capturedOutput = '';
  let capturedSessionId: string | null = null;
  const sequenceRef = { value: persist?.initialSequence ?? 0 };

  // Promises
  let resolveDone: (code: number | null) => void;
  let resolveOutput: ((text: string) => void) | undefined;
  let rejectOutput: ((err: Error) => void) | undefined;

  const donePromise = new Promise<number | null>((resolve) => {
    resolveDone = resolve;
  });

  let outputPromise: Promise<string> | undefined;
  if (wantsOutput) {
    outputPromise = new Promise<string>((resolve, reject) => {
      resolveOutput = resolve;
      rejectOutput = reject;
    });
  }

  // Parse stdout
  proc.stdout?.on('data', async (chunk: Buffer) => {
    const data = chunk.toString();
    buffer += data;
    onRawChunk?.(data);

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (persist) {
        const { isComplete, sessionId: sid } = await parseStreamLine(line, sequenceRef, persist);

        if (sid && !capturedSessionId) {
          capturedSessionId = sid;
          onSessionId?.(sid);
        }

        if (isComplete && wantsOutput) {
          // Extract result text from the result message
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.type === 'result' && parsed.result) {
              capturedOutput = parsed.result;
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        // No persistence — just parse for output and session ID
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const sid = parsed.session_id as string | undefined;
          if (sid && !capturedSessionId) {
            capturedSessionId = sid;
            onSessionId?.(sid);
          }

          if (wantsOutput) {
            if (parsed.type === 'result' && parsed.result) {
              capturedOutput = parsed.result;
            } else if (parsed.type === 'assistant' && parsed.message?.content) {
              for (const block of parsed.message.content as Array<{
                type: string;
                text?: string;
              }>) {
                if (block.type === 'text' && block.text) {
                  capturedOutput = block.text;
                }
              }
            }
          }
        } catch {
          /* skip non-JSON */
        }
      }
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const prefix = trackAs ? `[Claude:${trackAs}]` : '[Claude]';
    console.error(`${prefix} stderr:`, data.toString());
  });

  const finalize = (code: number | null) => {
    if (trackAs) runningExecutions.delete(trackAs);

    if (wantsOutput) {
      if (capturedOutput) {
        resolveOutput?.(capturedOutput);
      } else {
        rejectOutput?.(new Error(`Claude process exited with code ${code} and no output`));
      }
    }

    onComplete?.(code, code === 0);
    resolveDone(code);
  };

  proc.on('exit', async (code) => {
    // Process remaining buffer
    if (buffer.trim()) {
      if (persist) {
        const { sessionId: sid } = await parseStreamLine(buffer, sequenceRef, persist);
        if (sid && !capturedSessionId) {
          capturedSessionId = sid;
          onSessionId?.(sid);
        }
      } else {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (wantsOutput && parsed.type === 'result' && parsed.result) {
            capturedOutput = parsed.result;
          }
        } catch {
          /* ignore */
        }
      }
    }
    finalize(code);
  });

  proc.on('error', (err) => {
    const prefix = trackAs ? `[Claude:${trackAs}]` : '[Claude]';
    console.error(`${prefix} process error:`, err);
    if (wantsOutput) rejectOutput?.(err);
    if (trackAs) runningExecutions.delete(trackAs);
    onComplete?.(null, false);
    resolveDone(null);
  });

  // Timeout
  setTimeout(() => {
    if (trackAs && runningExecutions.has(trackAs)) {
      proc.kill('SIGTERM');
      const prefix = trackAs ? `[Claude:${trackAs}]` : '[Claude]';
      console.log(`${prefix} timed out after ${timeoutMs}ms`);
    } else if (!trackAs && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }, timeoutMs);

  // Build result
  const result: ClaudeSpawnResult = {
    process: proc,
    done: donePromise,
    kill: () => {
      if (!proc.killed) proc.kill('SIGTERM');
      if (trackAs) runningExecutions.delete(trackAs);
    },
  };

  if (outputPromise) {
    result.output = outputPromise;
    if (outputSchema) {
      result.structured = outputPromise.then((text) => {
        const jsonStr = extractJson(text);
        return JSON.parse(jsonStr);
      });
    }
  }

  return result;
}

/**
 * Convenience wrapper: spawn Claude and return structured JSON output.
 * Waits for completion and returns the parsed result.
 */
export async function spawnClaudeStructured<T>(
  options: Omit<ClaudeSpawnOptions, 'returnOutput'> & {
    outputSchema: { name: string; schema: Record<string, unknown> };
  }
): Promise<T> {
  const result = spawnClaude({ ...options, returnOutput: true });
  return (await result.structured) as T;
}
