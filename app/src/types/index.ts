export interface GitStatus {
  isGitRepo: boolean;
  branch: string | null;
  dirtyCount: number;
  ahead: number;
  behind: number;
}

export interface WorkingDirectory {
  id: string;
  path: string;
  label: string | null;
  source: 'env' | 'auto' | 'user';
  isDefault: boolean;
  isRootDirectory: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  port: number;
  wsUrl: string;
  name: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface CreateSessionResponse {
  id: string;
  port: number;
  wsUrl: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  activeSessions: number;
  uptime: number;
  defaultWorkingDirectory?: string;
}

export interface ScheduledTask {
  id: string;
  prompt: string;
  name: string | null;
  intervalMinutes: number;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  maxRuns: number | null;
  isRunning: boolean;
  isQueued: boolean;
  model: ClaudeModel;
  isSystem: boolean;
  workingDir?: string;
}

export interface CreateScheduledTaskRequest {
  prompt: string;
  intervalMinutes: number;
  maxRuns?: number | null;
  name?: string;
  workingDir?: string;
  model?: ClaudeModel;
}

export interface UpdateScheduledTaskRequest {
  prompt?: string;
  intervalMinutes?: number;
  status?: 'active' | 'paused';
  maxRuns?: number | null;
  name?: string;
  model?: ClaudeModel;
  workingDir?: string | null;
}

export interface TaskRun {
  id: string;
  taskId: string;
  runIndex: number;
  chatId: string | null;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  outputFile: string | null;
  errorMessage: string | null;
}

export interface TaskMessage {
  id: string;
  runId: string;
  sequence: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: ClaudeMessageContent;
  createdAt: string;
}

// Claude JSON output content types
export interface ClaudeMessageContent {
  type: string;
  subtype?: string;
  message?: {
    role: string;
    content: ClaudeContentBlock[];
  };
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'image';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ClaudeContentBlock[];
  is_error?: boolean;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type PermissionMode = 'plan' | 'auto-accept' | 'dangerous';
export type ClaudeModel = 'opus' | 'sonnet' | 'haiku';

export interface InteractiveChat {
  id: string;
  name: string;
  type: string;
  claudeSessionId: string | null;
  status: 'active' | 'completed';
  permissionMode: PermissionMode;
  model: ClaudeModel;
  systemPrompt: string | null;
  maxTurns: number | null;
  effort: string | null;
  isRunning: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  workingDir: string | null;
  allowedTools: string[] | null;
  fastMode: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  branchId: string;
  sequence: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: ClaudeMessageContent;
  createdAt: string;
}

export interface EventTimerEntry {
  id: string;
  recordedAt: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  fullAddress: string | null;
  name: string | null;
  description: string | null;
  note: string | null;
  createdAt: string;
}

export interface ModulePlan {
  id: string;
  title: string;
  description: string;
  route: string;
  source: string | null;
  sourceUrl: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  steps: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanStep {
  title: string;
  description: string;
  completed: boolean;
}

export interface CreateModulePlanRequest {
  title: string;
  description: string;
  route: string;
  source?: string;
  sourceUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  steps?: PlanStep[];
}

export interface LogsResponse {
  source: string;
  lines: number;
  totalLines: number;
  content: string;
  lastModified: string | null;
}

export interface UpdateModulePlanRequest {
  title?: string;
  description?: string;
  route?: string;
  source?: string;
  sourceUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  steps?: PlanStep[];
}

// Remotion Video types
export interface RemotionVideo {
  id: string;
  name: string;
  videoPath: string;
  chatId: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
}

export interface CreateRemotionVideoRequest {
  name: string;
  videoPath: string;
  chatId: string;
}

// Slash Command types
export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  type: 'skill' | 'builtin' | 'command';
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepRun {
  id: string;
  runId: string;
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  directory: string;
  masterChatId: string | null;
  status: 'creating' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  prompt: string;
  status: string;
  ceoAction: string | null;
  movedTo: string | null;
  createdAt: string;
}

export interface FeedbackDocument {
  document: string;
  entries: FeedbackEntry[];
}

export interface FileBrowseItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface McpServersResponse {
  servers: Record<string, McpServerConfig>;
  settingsPath: string;
}

export interface HookEntry {
  type: 'command';
  command: string;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

export interface HooksResponse {
  hooks: Record<string, HookMatcher[]>;
  settingsPath: string;
}

export interface MemoryFile {
  project: string;
  filename: string;
  name: string;
  description: string;
  type: string;
  content: string;
}

export interface MemoriesResponse {
  memories: MemoryFile[];
  basePath: string;
}
