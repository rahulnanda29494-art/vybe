import 'server-only';

/**
 * Minimal Groq client (OpenAI-compatible chat completions). The key stays on
 * the server. Every caller must treat AI output as a suggestion: failures,
 * timeouts and malformed replies return null, and features degrade to their
 * non-AI behaviour.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'qwen/qwen3.8-27b';

export const hasGroq = () => Boolean(process.env.GROQ_API_KEY?.trim());

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOpts {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  json?: boolean;
}

async function complete(messages: ChatMessage[], opts: CompletionOpts, jsonMode: boolean): Promise<string | null> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_completion_tokens: opts.maxTokens ?? 400,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 6000),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
    // Groq rejects replies that fail its JSON validator — the caller retries without JSON mode.
    if (jsonMode && body.error?.code === 'json_validate_failed') return complete(messages, opts, false);
    console.warn(`[groq] ${res.status} ${body.error?.code ?? ''}`.trim());
    return null;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}

/** Plain-text completion. Returns null when Groq is unavailable. */
export async function chat(messages: ChatMessage[], opts: CompletionOpts = {}): Promise<string | null> {
  if (!hasGroq()) return null;
  try {
    return await complete(messages, opts, false);
  } catch (err) {
    console.warn('[groq] request failed:', (err as Error).name);
    return null;
  }
}

/** JSON completion — extracts the first {...} object even if the model wraps it in prose. */
export async function chatJson<T>(messages: ChatMessage[], opts: CompletionOpts = {}): Promise<T | null> {
  if (!hasGroq()) return null;
  try {
    const text = await complete(messages, opts, true);
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text) as T;
  } catch (err) {
    console.warn('[groq] bad JSON reply:', (err as Error).name);
    return null;
  }
}

/** Small TTL cache so repeated prompts (same query, same video) don't re-bill. */
export function ttlCache<V>(ttlMs: number, max = 500) {
  const store = new Map<string, { v: V; at: number }>();
  return {
    get(key: string): V | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) {
        store.delete(key);
        return undefined;
      }
      return hit.v;
    },
    set(key: string, v: V) {
      if (store.size >= max) store.delete(store.keys().next().value as string);
      store.set(key, { v, at: Date.now() });
    },
  };
}
