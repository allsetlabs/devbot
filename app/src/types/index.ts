export interface UnifiedDir {
  encoded: string;
  displayPath: string;
  sessionCount: number;
}

export interface UnifiedDirsResponse {
  dirs: UnifiedDir[];
  defaultDir: string | null;
}

export interface UnifiedSession {
  sessionId: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  messageCount: number;
}

export interface UnifiedMessage {
  uuid: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface UnifiedChatResponse {
  messages: UnifiedMessage[];
  sessionId: string;
  cwd: string;
  gitBranch: string;
}

export interface OcrDocument {
  id: string;
  original_name: string;
  image_path: string;
  txt_path: string | null;
  extracted_text: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface OcrUploadResponse {
  success: boolean;
  doc: OcrDocument;
}

export interface MessageSearchResult {
  messageId: string;
  chatId: string;
  chatName: string;
  sequence: number;
  type: 'user' | 'assistant';
  preview: string;
  timestamp: string;
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

export interface DoctorCheck {
  status: 'pass' | 'warn' | 'fail';
  label: string;
  value?: string;
  detail?: string;
}

export interface DoctorResponse {
  checks: Record<string, DoctorCheck>;
  timestamp: string;
}

export type TriggerType = 'interval' | 'cron' | 'event' | 'once';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ScheduledTask {
  id: string;
  prompt: string;
  name: string | null;
  intervalMinutes: number;
  triggerType: TriggerType;
  cronExpression: string | null;
  cronDescription: string | null;
  priority: TaskPriority;
  category: string | null;
  parentTaskId: string | null;
  contextFile: string | null;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  maxRuns: number | null;
  isRunning: boolean;
  isQueued: boolean;
  model: ClaudeModel;
  effort: EffortLevel | null;
  isSystem: boolean;
  workingDir?: string;
  tags: string[];
}

export interface CreateScheduledTaskRequest {
  prompt: string;
  intervalMinutes?: number;
  maxRuns?: number | null;
  name?: string;
  workingDir?: string;
  model?: ClaudeModel;
  effort?: EffortLevel;
  triggerType?: TriggerType;
  cronExpression?: string;
  priority?: TaskPriority;
  category?: string;
  contextFile?: string;
  tags?: string[];
}

export interface UpdateScheduledTaskRequest {
  prompt?: string;
  intervalMinutes?: number;
  status?: 'active' | 'paused';
  maxRuns?: number | null;
  name?: string;
  model?: ClaudeModel;
  effort?: EffortLevel | null;
  workingDir?: string | null;
  triggerType?: TriggerType;
  cronExpression?: string | null;
  priority?: TaskPriority;
  category?: string | null;
  contextFile?: string | null;
  tags?: string[];
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
  effort: string | null;
  isRunning: boolean;
  progress: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  workingDir: string | null;
  fastMode: boolean;
  starred: boolean;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sequence: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: ClaudeMessageContent;
  createdAt: string;
}

export interface QueuedMessage {
  id: string;
  chatId: string;
  prompt: string;
  position: number;
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

// Event Source types
export type EventSourceType = 'stock' | 'news' | 'weather' | 'webhook' | 'file_watch' | 'custom';

export interface EventSource {
  id: string;
  name: string;
  type: EventSourceType;
  config: Record<string, unknown>;
  status: 'active' | 'paused';
  pollIntervalSeconds: number;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  linkedTaskIds: string[];
}

export interface EventTaskLink {
  id: string;
  eventSourceId: string;
  taskId: string;
  condition: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEventSourceRequest {
  name: string;
  type: EventSourceType;
  config: Record<string, unknown>;
  pollIntervalSeconds?: number;
  status?: 'active' | 'paused';
}

export interface UpdateEventSourceRequest {
  name?: string;
  type?: EventSourceType;
  config?: Record<string, unknown>;
  pollIntervalSeconds?: number;
  status?: 'active' | 'paused';
}

export interface EventSourceTestResult {
  triggered: boolean;
  details: string;
}

// CLI Dashboard types
export type CLIProvider = 'claude' | 'codex' | 'kimi' | 'cursor';

export interface ProviderInfo {
  id: CLIProvider;
  name: string;
  available: boolean;
  sessionCount: number;
  dataDir: string;
  model?: string;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
}

export interface ProviderSession {
  sessionId: string;
  provider: CLIProvider;
  preview: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  messageCount: number;
  model?: string;
  projectDir?: string;
}

export interface AllSessionsResponse {
  sessions: ProviderSession[];
  total: number;
}

export interface ProviderMessage {
  uuid: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ProviderSessionDetail {
  messages: ProviderMessage[];
  sessionId: string;
  provider: CLIProvider;
  cwd: string;
  gitBranch: string;
  model?: string;
}

// File Store types
export interface FileStoreInfo {
  name: string;
  filePath: string;
  recordCount: number;
  fileSize: number;
  lastModified: string | null;
  autoCommit: boolean;
}

export interface FileStoreRecord {
  id: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FileStoreDetail extends FileStoreInfo {
  records: FileStoreRecord[];
}

// Auth tokens (for mobile/programmatic access)
export interface AuthTokenInfo {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastUsedAt: string | null;
  tokenPreview: string;
}

export interface AuthTokenCreateResponse {
  token: string;
  name: string;
  createdAt: string;
}
