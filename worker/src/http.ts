import type { WorkerEnv } from './env';

export function corsHeaders(env: WorkerEnv, request: Request): HeadersInit {
  const requestOrigin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || requestOrigin || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers':
      'X-RateLimit-Remaining, X-RateLimit-Limit, X-RateLimit-Durable, X-Usage-Remaining, X-Usage-Limit',
    Vary: 'Origin',
  };
}

export function json(
  env: WorkerEnv,
  request: Request,
  status: number,
  payload: unknown,
  extra?: HeadersInit,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(env, request),
      ...extra,
    },
  });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('Cookie') ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function cookieHeader(name: string, value: string, maxAgeSeconds: number, httpOnly = true, secure = false): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
