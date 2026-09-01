import { BACKEND_URL, authHeaders } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OllamaStatus {
  running: boolean;
  baseUrl: string;
  modelCount: number;
  models: string[];
  sttCorrectionModel: string;
  customModelsCount: number;
}

export interface LocalModel {
  name: string;
  size: number;
  sizeHuman: string;
  modifiedAt: string;
  digest: string;
  family: string;
  parameterSize: string;
  quantization: string;
  isCustom: boolean;
  isSttModel: boolean;
}

export interface RecommendedModel {
  name: string;
  displayName: string;
  description: string;
  size: string;
  category: 'fast' | 'balanced' | 'capable';
  useCases: string[];
  pulled: boolean;
}

export interface CustomModelDef {
  name: string;
  baseModel: string;
  systemPrompt: string;
  parameters: Record<string, unknown>;
  inheritDictionary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponse {
  response: string;
  model: string;
  done: boolean;
  metrics: {
    totalDurationMs: number | null;
    evalCount: number | null;
    evalDurationMs: number | null;
    promptEvalCount: number | null;
    tokensPerSecond: number | null;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: ChatMessage;
  model: string;
  done: boolean;
  metrics: GenerateResponse['metrics'];
}

export interface ModelDetail {
  name: string;
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
  isCustom: boolean;
  customDef: CustomModelDef | null;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchLocalModels<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}/api/local-models${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const localModelsApi = {
  /** Get Ollama connection status */
  getStatus: (): Promise<OllamaStatus> => fetchLocalModels('/status'),

  /** List all pulled models */
  listModels: (): Promise<{ running: boolean; models: LocalModel[] }> => fetchLocalModels('/'),

  /** List recommended models */
  getRecommended: (): Promise<{ recommended: RecommendedModel[] }> =>
    fetchLocalModels('/recommended'),

  /** List custom model definitions */
  listCustomModels: (): Promise<{ customModels: CustomModelDef[] }> =>
    fetchLocalModels('/custom'),

  /** Get model details */
  getModelDetail: (name: string): Promise<ModelDetail> =>
    fetchLocalModels(`/${encodeURIComponent(name)}`),

  /** Pull a model from registry */
  pullModel: (name: string): Promise<{ success: boolean; name: string; message: string }> =>
    fetchLocalModels('/pull', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Delete a model */
  deleteModel: (name: string): Promise<{ success: boolean; name: string; message: string }> =>
    fetchLocalModels(`/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  /** Run text generation */
  generate: (params: {
    model: string;
    prompt: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<GenerateResponse> =>
    fetchLocalModels('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Chat completion */
  chat: (params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<ChatResponse> =>
    fetchLocalModels('/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Create a custom model */
  createCustomModel: (params: {
    name: string;
    baseModel: string;
    systemPrompt: string;
    parameters?: Record<string, unknown>;
    inheritDictionary?: boolean;
  }): Promise<{ success: boolean; name: string; message: string; modelfile: string }> =>
    fetchLocalModels('/custom', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Get corrections dictionary */
  getDictionary: (): Promise<{ corrections: Record<string, string[]>; count: number; path: string }> =>
    fetchLocalModels('/dictionary'),
};
