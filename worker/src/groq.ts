export const VISION_MODEL = 'qwen/qwen3.8-27b';
export const TEXT_MODEL = 'openai/gpt-oss-20b';

type ChatMessage = {
  role: 'system' | 'user';
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
};

export async function groqChat(options: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  json: boolean;
}): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: 0.2,
      max_completion_tokens: 2500,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
        reasoning?: string;
      };
    }>;
  };

  if (!response.ok) {
    const message = payload.error?.message ?? `Groq request failed (${response.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  const message = payload.choices?.[0]?.message;
  const content =
    messageToText(message?.content) ||
    (typeof message?.reasoning === 'string' ? message.reasoning : '');
  if (!content) {
    throw new Error('Groq returned an empty message.');
  }
  return stripReasoning(content);
}

function messageToText(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part.text === 'string' ? part.text : '')).join('');
}

function stripReasoning(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('The model did not return JSON.');
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}
