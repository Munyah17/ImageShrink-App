import { planOf, type PlanId } from '../../src/lib/plans';
import type { WorkerEnv } from './env';
import { json } from './http';
import { resolveIdentity } from './auth';

type Kind = 'compress' | 'ai';

export async function bumpUsage(
  env: WorkerEnv,
  identity: string,
  kind: Kind,
  amount: number,
  plan: PlanId,
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  const limits = planOf(plan);
  const limit = kind === 'compress' ? limits.compressPerDay : limits.aiPerDay;
  const day = new Date().toISOString().slice(0, 10);
  const column = kind === 'compress' ? 'compress_count' : 'ai_count';

  if (!env.DB) {
    return { allowed: true, used: 0, limit, remaining: limit };
  }

  await env.DB.prepare(
    'INSERT INTO usage_daily (identity, day, compress_count, ai_count) VALUES (?, ?, 0, 0) ON CONFLICT(identity, day) DO NOTHING',
  )
    .bind(identity, day)
    .run();

  const row = await env.DB.prepare('SELECT compress_count, ai_count FROM usage_daily WHERE identity = ? AND day = ?')
    .bind(identity, day)
    .first<{ compress_count: number; ai_count: number }>();
  const used = kind === 'compress' ? (row?.compress_count ?? 0) : (row?.ai_count ?? 0);
  if (used + amount > limit) {
    if (kind === 'compress') {
      await env.DB.prepare(`UPDATE usage_daily SET ${column} = ${column} + ? WHERE identity = ? AND day = ?`)
        .bind(amount, identity, day)
        .run();
      return { allowed: true, used: used + amount, limit, remaining: 0 };
    }
    return { allowed: false, used, limit, remaining: Math.max(0, limit - used) };
  }

  await env.DB.prepare(`UPDATE usage_daily SET ${column} = ${column} + ? WHERE identity = ? AND day = ?`)
    .bind(amount, identity, day)
    .run();
  const next = used + amount;
  return { allowed: true, used: next, limit, remaining: Math.max(0, limit - next) };
}

export async function readUsage(env: WorkerEnv, identity: string, plan: PlanId) {
  const limits = planOf(plan);
  const day = new Date().toISOString().slice(0, 10);
  if (!env.DB) {
    return {
      compress: { used: 0, limit: limits.compressPerDay },
      ai: { used: 0, limit: limits.aiPerDay },
    };
  }
  const row = await env.DB.prepare('SELECT compress_count, ai_count FROM usage_daily WHERE identity = ? AND day = ?')
    .bind(identity, day)
    .first<{ compress_count: number; ai_count: number }>();
  return {
    compress: { used: row?.compress_count ?? 0, limit: limits.compressPerDay },
    ai: { used: row?.ai_count ?? 0, limit: limits.aiPerDay },
  };
}

export async function handleUsage(request: Request, env: WorkerEnv): Promise<Response> {
  const identity = await resolveIdentity(request, env);
  const extra = identity.setCookie ? { 'Set-Cookie': identity.setCookie } : undefined;
  const path = new URL(request.url).pathname;

  if (request.method === 'GET' && path.endsWith('/usage')) {
    const usage = await readUsage(env, identity.key, identity.plan);
    return json(env, request, 200, { usage, plan: planOf(identity.plan), user: identity.user }, extra);
  }

  if (request.method === 'POST' && path.endsWith('/compress')) {
    let amount = 1;
    try {
      const body = (await request.json()) as { amount?: number };
      if (typeof body.amount === 'number' && body.amount >= 1 && body.amount <= 50) amount = Math.round(body.amount);
    } catch {
      amount = 1;
    }
    const result = await bumpUsage(env, identity.key, 'compress', amount, identity.plan);
    if (!result.allowed) {
      return json(
        env,
        request,
        429,
        {
          error: 'Daily compression allowance reached. It resets at midnight UTC, or upgrade for a higher cap.',
          code: 'quota',
          ...result,
        },
        extra,
      );
    }
    return json(env, request, 200, result, extra);
  }

  return json(env, request, 404, { error: 'Unknown usage endpoint.', code: 'validation' }, extra);
}
