import { PLANS, planOf, type PlanId } from '../../src/lib/plans';
import type { WorkerEnv } from './env';
import { clientIp, cookieHeader, json, parseCookies } from './http';

const SESSION_DAYS = 30;
const GUEST_COOKIE = 'imageshrink_guest';
const SESSION_COOKIE = 'imageshrink_session';

export type SessionUser = {
  id: string;
  email: string;
  plan: PlanId;
};

function encoder() {
  return new TextEncoder();
}

function toB64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromB64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hashPassword(password: string, saltBytes?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const salt = saltBytes ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120_000 },
    key,
    256,
  );
  return { hash: toB64(bits), salt: toB64(salt) };
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder().encode(a);
  const right = encoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

function cookieSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

export async function guestIdentity(request: Request, env: WorkerEnv): Promise<{ id: string; setCookie?: string }> {
  const cookies = parseCookies(request);
  if (cookies[GUEST_COOKIE]) return { id: `guest:${cookies[GUEST_COOKIE]}` };
  const id = crypto.randomUUID();
  return {
    id: `guest:${id}`,
    setCookie: cookieHeader(GUEST_COOKIE, id, 60 * 60 * 24 * 365, false, cookieSecure(request)),
  };
}

export async function readSession(request: Request, env: WorkerEnv): Promise<SessionUser | null> {
  if (!env.DB) return null;
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT users.id, users.email, users.plan, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?',
  )
    .bind(token)
    .first<{ id: string; email: string; plan: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, plan: planOf(row.plan).id };
}

export async function handleAuth(request: Request, env: WorkerEnv): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  if (request.method === 'GET' && path.endsWith('/me')) {
    const user = await readSession(request, env);
    const guest = await guestIdentity(request, env);
    const extra = guest.setCookie ? { 'Set-Cookie': guest.setCookie } : undefined;
    if (!user) {
      return json(env, request, 200, { user: null, guestId: guest.id, plan: PLANS.free }, extra);
    }
    return json(env, request, 200, { user, guestId: guest.id, plan: planOf(user.plan) }, extra);
  }

  if (!env.DB) {
    return json(env, request, 503, {
      error: 'Accounts are not configured yet. Compression still works without an account.',
      code: 'unavailable',
    });
  }

  if (request.method === 'POST' && path.endsWith('/logout')) {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return json(env, request, 200, { ok: true }, { 'Set-Cookie': cookieHeader(SESSION_COOKIE, '', 0, true, cookieSecure(request)) });
  }

  if (request.method !== 'POST') {
    return json(env, request, 405, { error: 'Method not allowed.', code: 'validation' });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return json(env, request, 400, { error: 'Request body must be JSON.', code: 'validation' });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!validEmail(email) || password.length < 8) {
    return json(env, request, 400, {
      error: 'Use a valid email and a password of at least 8 characters.',
      code: 'validation',
    });
  }

  if (path.endsWith('/signup')) {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
    if (existing) {
      return json(env, request, 409, { error: 'An account with that email already exists.', code: 'validation' });
    }
    const { hash, salt } = await hashPassword(password);
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, password_salt, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(id, email, hash, salt, 'free', Date.now())
      .run();
    return issueSession(env, request, { id, email, plan: 'free' });
  }

  if (path.endsWith('/login')) {
    const row = await env.DB.prepare(
      'SELECT id, email, plan, password_hash, password_salt FROM users WHERE email = ?',
    )
      .bind(email)
      .first<{ id: string; email: string; plan: string; password_hash: string; password_salt: string }>();
    if (!row) {
      return json(env, request, 401, { error: 'Email or password is incorrect.', code: 'validation' });
    }
    const { hash } = await hashPassword(password, fromB64(row.password_salt));
    if (!timingSafeEqual(hash, row.password_hash)) {
      return json(env, request, 401, { error: 'Email or password is incorrect.', code: 'validation' });
    }
    return issueSession(env, request, { id: row.id, email: row.email, plan: planOf(row.plan).id });
  }

  return json(env, request, 404, { error: 'Unknown auth endpoint.', code: 'validation' });
}

async function issueSession(env: WorkerEnv, request: Request, user: SessionUser): Promise<Response> {
  const token = toB64(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB?.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expires)
    .run();
  return json(env, request, 200, { user, plan: planOf(user.plan) }, {
    'Set-Cookie': cookieHeader(SESSION_COOKIE, token, SESSION_DAYS * 24 * 60 * 60, true, cookieSecure(request)),
  });
}

export async function resolveIdentity(request: Request, env: WorkerEnv): Promise<{
  key: string;
  user: SessionUser | null;
  plan: PlanId;
  setCookie?: string;
}> {
  const user = await readSession(request, env);
  if (user) return { key: `user:${user.id}`, user, plan: user.plan };
  const guest = await guestIdentity(request, env);
  return { key: guest.id, user: null, plan: 'free', setCookie: guest.setCookie };
}

export { clientIp, GUEST_COOKIE, SESSION_COOKIE };
