/**
 * Direct-from-browser Anthropic API client.
 *
 * ⚠️  The API key is embedded in client JS at build time. Treat it as
 * throwaway / rate-limited / scoped. Anthropic requires the special
 * header `anthropic-dangerous-direct-browser-access: true` to acknowledge
 * that this is unsafe for production.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  system?: string;
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export function hasApiKey(): boolean {
  return Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY);
}

function apiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!key) {
    throw new Error(
      'No Claude API key configured. Set VITE_ANTHROPIC_API_KEY in .env.local',
    );
  }
  return key;
}

/**
 * Stream a chat completion from Claude as an async iterable of text deltas.
 * Yields incremental chunks of the assistant's response.
 */
export async function* streamClaude(
  messages: ChatMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string, void, void> {
  const body = {
    model: opts.model ?? (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
    ...(opts.system ? { system: opts.system } : {}),
    messages,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(`Claude API error ${res.status}: ${detail || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by blank lines.
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const lines = ev.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            yield evt.delta.text as string;
          }
        } catch {
          // ignore parse error
        }
      }
    }
  }
}
