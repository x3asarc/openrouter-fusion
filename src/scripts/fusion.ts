import type { Turn, ModelResponse } from './storage';

// ─── Model List ───────────────────────────────────────────────────────────────

export interface ORModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
  top_provider?: { context_length?: number };
}

let _modelCache: ORModel[] | null = null;

export async function fetchModels(apiKey: string): Promise<ORModel[]> {
  if (_modelCache) return _modelCache;
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
  const json = await res.json() as { data: ORModel[] };
  _modelCache = json.data.sort((a, b) => a.name.localeCompare(b.name));
  return _modelCache;
}

export function clearModelCache(): void {
  _modelCache = null;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const PRESETS = {
  quality: [
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
  ],
  budget: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku',
    'google/gemini-flash-1.5',
  ],
};

// ─── Streaming ────────────────────────────────────────────────────────────────

export async function streamCompletion(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<string> {
  let full = '';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'OpenRouter Fusion Replica',
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`[${res.status}] ${errText}`);
      return full;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {}
      }
    }
    onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onError(msg);
  }
  return full;
}

// ─── Fusion ───────────────────────────────────────────────────────────────────

export function buildFusionPrompt(
  userMessage: string,
  responses: ModelResponse[]
): string {
  const parts = responses
    .map((r, i) => `### Response ${i + 1} (${r.model})\n${r.content}`)
    .join('\n\n');

  return `You are a synthesis AI. You have been given multiple AI model responses to the same user question. Your task is to analyze all responses and produce a single, comprehensive, well-structured answer that:
- Captures the best insights from each response
- Resolves any contradictions with sound reasoning
- Is more complete and accurate than any individual response
- Is clearly written and well-organized

## User Question
${userMessage}

## Model Responses
${parts}

## Your Fused Answer
Synthesize the above responses into the definitive best answer:`;
}

export async function runFusion(params: {
  apiKey: string;
  models: string[];
  systemPrompt: string;
  conversationHistory: { role: string; content: string }[];
  userMessage: string;
  fusionModel: string;
  onModelChunk: (model: string, chunk: string) => void;
  onModelDone: (model: string) => void;
  onModelError: (model: string, err: string) => void;
  onFusionChunk: (chunk: string) => void;
  onFusionDone: () => void;
  onFusionError: (err: string) => void;
}): Promise<Turn> {
  const {
    apiKey, models, systemPrompt, conversationHistory,
    userMessage, fusionModel,
    onModelChunk, onModelDone, onModelError,
    onFusionChunk, onFusionDone, onFusionError,
  } = params;

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push(...conversationHistory);
  messages.push({ role: 'user', content: userMessage });

  // Run all models in parallel
  const modelResults = await Promise.all(
    models.map(async (model) => {
      const content = await streamCompletion(
        apiKey, model, messages,
        (chunk) => onModelChunk(model, chunk),
        () => onModelDone(model),
        (err) => onModelError(model, err)
      );
      return { model, content };
    })
  );

  // Fusion synthesis
  const fusionMsgContent = buildFusionPrompt(userMessage, modelResults);
  const fusionMessages = [{ role: 'user', content: fusionMsgContent }];
  const fusionModelId = fusionModel === 'auto' ? models[0] : fusionModel;

  const fusedResponse = await streamCompletion(
    apiKey, fusionModelId!, fusionMessages,
    onFusionChunk,
    onFusionDone,
    onFusionError
  );

  return {
    userMessage,
    modelResponses: modelResults,
    fusedResponse,
  };
}
