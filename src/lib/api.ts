export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  let payload: T & { error?: string; code?: string; remaining?: number; limit?: number } = {} as T & {
    error?: string;
    code?: string;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = { error: 'The server returned an empty response.' } as typeof payload;
  }
  if (remaining) payload.remaining = Number(remaining);
  if (limit) payload.limit = Number(limit);

  if (!response.ok) {
    throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status, payload.code);
  }
  return payload;
}

export async function apiHealth(): Promise<{
  ok: boolean;
  aiConfigured: boolean;
  accountsConfigured: boolean;
  billingConfigured: boolean;
} | null> {
  try {
    return await api('/api/health');
  } catch {
    return null;
  }
}
