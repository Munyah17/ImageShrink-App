import { planOf, type PlanId } from '../../src/lib/plans';
import { json } from './http';
import { readSession } from './auth';
import type { WorkerEnv } from './env';

function originOf(request: Request, env: WorkerEnv): string {
  return env.APP_ORIGIN || request.headers.get('Origin') || 'http://localhost:5173';
}

export async function handleBilling(request: Request, env: WorkerEnv): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (request.method === 'POST' && path.endsWith('/webhook')) {
    return handleStripeWebhook(request, env);
  }

  const user = await readSession(request, env);
  if (!user) {
    return json(env, request, 401, { error: 'Log in to upgrade.', code: 'auth' });
  }

  if (request.method !== 'POST' || !path.endsWith('/checkout')) {
    return json(env, request, 404, { error: 'Unknown billing endpoint.', code: 'validation' });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return json(env, request, 503, {
      error: 'Payments are not configured. Add STRIPE_SECRET_KEY on the Worker.',
      code: 'unavailable',
    });
  }

  const body = (await request.json()) as { plan?: string };
  const plan = body.plan === 'pro' ? 'pro' : 'plus';
  const price = plan === 'pro' ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_PLUS;
  if (!price) {
    return json(env, request, 503, {
      error: 'Stripe price IDs are missing. Set STRIPE_PRICE_PLUS and STRIPE_PRICE_PRO.',
      code: 'unavailable',
    });
  }

  const origin = originOf(request, env);
  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: `${origin}/account?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: user.id,
    customer_email: user.email,
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    'subscription_data[metadata][userId]': user.id,
    'subscription_data[metadata][plan]': plan,
    'metadata[userId]': user.id,
    'metadata[plan]': plan,
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) {
    return json(env, request, 502, {
      error: payload.error?.message ?? 'Could not start Stripe Checkout.',
      code: 'unavailable',
    });
  }
  return json(env, request, 200, { url: payload.url });
}

async function handleStripeWebhook(request: Request, env: WorkerEnv): Promise<Response> {
  if (!env.DB) {
    return json(env, request, 503, { error: 'Billing is not configured.', code: 'unavailable' });
  }
  const raw = await request.text();
  if (env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return json(env, request, 400, { error: 'Invalid Stripe signature.', code: 'validation' });
    }
  }
  const event = JSON.parse(raw) as {
    type?: string;
    data?: {
      object?: {
        client_reference_id?: string;
        metadata?: { userId?: string; plan?: string };
      };
    };
  };
  if (event.type === 'checkout.session.completed') {
    const object = event.data?.object;
    const userId = object?.metadata?.userId || object?.client_reference_id;
    const plan = (object?.metadata?.plan === 'pro' ? 'pro' : 'plus') as PlanId;
    if (userId) {
      await env.DB.prepare('UPDATE users SET plan = ? WHERE id = ?').bind(plan, userId).run();
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    const userId = event.data?.object?.metadata?.userId;
    if (userId) {
      await env.DB.prepare('UPDATE users SET plan = ? WHERE id = ?').bind('free', userId).run();
    }
  }
  return json(env, request, 200, { received: true, plan: planOf('plus').id });
}

async function verifyStripeSignature(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key.trim(), rest.join('=')];
    }),
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i += 1) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
