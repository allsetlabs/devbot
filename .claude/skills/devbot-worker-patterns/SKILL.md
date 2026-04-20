---
name: devbot-worker-patterns
description: Enforces consistent patterns for Claude CLI worker processes in DevBot backend. Covers process spawning, stream-json parsing, message persistence, and cleanup. Auto-triggers when editing worker files in backend/src/lib/.
---

# DevBot Worker Patterns

## When This Skill Activates

Auto-trigger when creating or editing any `*-worker.ts` file in `backend/src/lib/`.

## Context

DevBot has 3 worker files that spawn Claude CLI processes:

- `scheduler-worker.ts` (417 lines) - FCFS queue for scheduled tasks
- `interactive-chat-worker.ts` (395 lines) - Interactive chat sessions
- `lawn-plan-worker.ts` (290 lines) - Lawn plan generation via chat

All three share common patterns for spawning Claude CLI, parsing stream-json output, and persisting messages. This skill ensures consistency.

## Rules

### 1. Claude CLI Spawn Pattern

All Claude CLI processes MUST be spawned with this consistent pattern:

```typescript
import { spawn, ChildProcess } from 'child_process';

const claudeProcess = spawn(
  'claude',
  ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'],
  {
    cwd: DEVBOT_PROJECTS_DIR,
    env: { ...process.env },
  }
);
```

**Required flags:**

- `-p` with the prompt string
- `--output-format stream-json` for parseable output
- `--verbose` for detailed messages
- `--dangerously-skip-permissions` for autonomous execution

**Optional flags (add as needed):**

- `--resume {sessionId}` for continuing a session
- `--allowedTools` for restricting tool access
- `--model` for model override

### 2. Session Resume Pattern

When resuming a Claude session, use `--resume` flag:

```typescript
const args = [
  '--output-format', 'stream-json',
  '--verbose',
  '--dangerously-skip-permissions',
];

if (sessionId) {
  args.push('--resume', sessionId);
} else {
  args.push('-p', prompt);
}

const claudeProcess = spawn('claude', args, { ... });
```

### 3. Stream-JSON Parsing

Use the shared `stream-parser.ts` for parsing Claude output. Never re-implement parsing logic:

```typescript
import { parseStreamMessages } from './stream-parser';

// Collect stdout data
let buffer = '';
claudeProcess.stdout.on('data', (chunk: Buffer) => {
  buffer += chunk.toString();
});

// Parse on close
claudeProcess.on('close', async (code) => {
  const messages = parseStreamMessages(buffer);
  // Persist messages to database
});
```

### 4. Process Lifecycle Management

Every worker MUST handle these lifecycle events:

```typescript
// Track active processes for cleanup
const activeProcesses = new Map<string, ChildProcess>();

// Start
activeProcesses.set(taskId, claudeProcess);

// Stdout
claudeProcess.stdout.on('data', (chunk: Buffer) => { ... });

// Stderr (log but don't fail)
claudeProcess.stderr.on('data', (chunk: Buffer) => {
  console.error(`[Worker] stderr for ${taskId}:`, chunk.toString());
});

// Close
claudeProcess.on('close', async (code) => {
  activeProcesses.delete(taskId);
  // Update status in DB
});

// Error
claudeProcess.on('error', async (err) => {
  console.error(`[Worker] Process error for ${taskId}:`, err);
  activeProcesses.delete(taskId);
  // Update status to 'failed' in DB
});
```

### 5. Status Updates

Workers MUST update the database status at each lifecycle stage:

```typescript
// Before spawning
await supabase.from('table').update({ status: 'running' }).eq('id', id);

// On successful completion
await supabase.from('table').update({ status: 'completed' }).eq('id', id);

// On failure
await supabase.from('table').update({ status: 'failed' }).eq('id', id);

// On timeout
await supabase.from('table').update({ status: 'timeout' }).eq('id', id);
```

### 6. Timeout Handling

Long-running processes MUST have a timeout:

```typescript
const TASK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const timeout = setTimeout(() => {
  console.error(`[Worker] Task ${taskId} timed out after ${TASK_TIMEOUT_MS}ms`);
  claudeProcess.kill('SIGTERM');
  // Update status to 'timeout'
}, TASK_TIMEOUT_MS);

claudeProcess.on('close', () => {
  clearTimeout(timeout);
  // ... rest of cleanup
});
```

### 7. Named Constants

All magic numbers in workers MUST be named constants at the top of the file:

```typescript
// REQUIRED at top of every worker file
const CHECK_INTERVAL_MS = 30_000; // How often to check for new work
const TASK_TIMEOUT_MS = 30 * 60_000; // Max execution time
const POLL_INTERVAL_MS = 5_000; // Status polling interval
const MAX_RETRIES = 3; // Retry count for transient failures
```

### 8. Queue Pattern (for scheduler-worker)

The FCFS queue pattern should be used when multiple tasks can be queued:

```typescript
interface QueueEntry {
  task: TaskRow;
  resolve: () => void;
}

const executionQueue: QueueEntry[] = [];
let isProcessingQueue = false;

function enqueue(task: TaskRow): Promise<void> {
  return new Promise((resolve) => {
    executionQueue.push({ task, resolve });
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (executionQueue.length > 0) {
    const entry = executionQueue.shift();
    if (!entry) continue;
    await executeTask(entry.task);
    entry.resolve();
  }

  isProcessingQueue = false;
}
```

### 9. Logging Convention

All worker logs MUST use a consistent prefix:

```typescript
console.log(`[Scheduler] Starting task ${task.id}`);
console.log(`[InteractiveChat] Sending message to chat ${chatId}`);
console.log(`[LawnPlan] Generating plan for profile ${profileId}`);
console.error(`[Scheduler] Error:`, error);
```

### 10. Session ID Extraction

Extract Claude session IDs from stream-json for resume capability:

```typescript
// Look for session_id in the init message
const initMessage = messages.find((m) => m.type === 'system' && m.subtype === 'init');
const sessionId = initMessage?.session_id;

// Or from the result message
const resultMessage = messages.find((m) => m.type === 'result');
const sessionId = resultMessage?.session_id;
```

## Verification Checklist

Before completing any worker file edit:

- [ ] Claude CLI spawned with required flags
- [ ] Uses `stream-parser.ts` for parsing (no custom parsing)
- [ ] All lifecycle events handled (stdout, stderr, close, error)
- [ ] Status updates at each lifecycle stage
- [ ] Timeout mechanism in place
- [ ] All magic numbers are named constants
- [ ] Consistent log prefix used
- [ ] Active process tracked for cleanup
- [ ] Session ID extracted and persisted if needed
