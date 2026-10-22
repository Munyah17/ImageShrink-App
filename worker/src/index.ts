import { handleAiRequest } from './handler';
import { handleAuth } from './auth';
import { handleBilling } from './billing';
import { handleUsage } from './usageStore';
import { corsHeaders, json } from './http';
import type { WorkerEnv } from './env';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(env, request) });
      }

      const path = new URL(request.url).pathname;

      if (request.method === 'GET' && (path === '/api/health' || path.endsWith('/health'))) {
        return json(env, request, 200, {
          ok: true,
          aiConfigured: Boolean(env.GROQ_API_KEY),
          accountsConfigured: Boolean(env.DB),
          billingConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PLUS),
        });
      }

      if (path.startsWith('/api/auth')) return handleAuth(request, env);
      if (path.startsWith('/api/usage')) return handleUsage(request, env);
      if (path.startsWith('/api/billing')) return handleBilling(request, env);
      if (path.startsWith('/api/ai')) return handleAiRequest(request, env);

      return json(env, request, 404, { error: 'Not found.', code: 'validation' });
    } catch (error) {
      console.log(JSON.stringify({ event: 'worker_crash', message: error instanceof Error ? error.message : 'unknown' }));
      return json(env, request, 503, {
        error: 'The API failed. Browser-side image tools still work.',
        code: 'unavailable',
      });
    }
  },
};
