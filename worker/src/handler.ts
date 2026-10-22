import {
  TEXT_MODEL,
  VISION_MODEL,
  asNumber,
  asString,
  asStringArray,
  groqChat,
  parseJsonObject,
} from './groq';
import { json } from './http';
import { resolveIdentity } from './auth';
import { bumpUsage } from './usageStore';
import type { WorkerEnv } from './env';

export type { WorkerEnv } from './env';

const MAX_BODY_BYTES = 3_500_000;
const MAX_DATA_URL_CHARS = 2_800_000;
const MAX_TEXT = 500;
const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;

type JsonBody = Record<string, unknown>;

function routeName(pathname: string): 'seo' | 'advise' | null {
  if (pathname.endsWith('/seo')) return 'seo';
  if (pathname.endsWith('/advise')) return 'advise';
  return null;
}

export async function handleAiRequest(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return json(env, request, 405, { error: 'Use POST.', code: 'validation' });
  }

  const route = routeName(new URL(request.url).pathname);
  if (!route) {
    return json(env, request, 404, { error: 'Unknown AI endpoint.', code: 'validation' });
  }

  const lengthHeader = request.headers.get('Content-Length');
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    return json(env, request, 413, { error: 'Request is too large.', code: 'validation' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(env, request, 413, { error: 'Request is too large.', code: 'validation' });
  }

  let body: JsonBody;
  try {
    body = JSON.parse(raw) as JsonBody;
  } catch {
    return json(env, request, 400, { error: 'Request body must be JSON.', code: 'validation' });
  }

  if (body.consent !== true) {
    return json(env, request, 403, {
      error: 'Consent is required before sending data to Groq.',
      code: 'consent',
    });
  }

  if (!env.GROQ_API_KEY) {
    console.log(JSON.stringify({ event: 'ai_unconfigured', route }));
    return json(env, request, 503, {
      error: 'The AI assistant is not configured. Browser-side compression still works.',
      code: 'unavailable',
    });
  }

  const identity = await resolveIdentity(request, env);
  const extra: Record<string, string> = {};
  if (identity.setCookie) extra['Set-Cookie'] = identity.setCookie;

  const usage = await bumpUsage(env, identity.key, 'ai', 1, identity.plan);
  extra['X-RateLimit-Remaining'] = String(usage.remaining);
  extra['X-RateLimit-Limit'] = String(usage.limit);
  extra['X-RateLimit-Durable'] = env.DB ? '1' : '0';

  if (!usage.allowed) {
    return json(
      env,
      request,
      429,
      {
        error: 'Daily AI allowance reached. Compression still works locally. Upgrade for a higher cap.',
        code: 'quota',
      },
      extra,
    );
  }

  try {
    const data = route === 'seo' ? await runSeo(env, body) : await runAdvise(env, body);
    console.log(JSON.stringify({ event: 'ai_ok', route, plan: identity.plan }));
    return json(env, request, 200, { data }, extra);
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 502;
    const message = error instanceof Error ? error.message : 'The AI service failed.';
    console.log(JSON.stringify({ event: 'ai_error', route, status, message }));
    if (status === 400) {
      return json(env, request, 400, { error: message, code: 'validation' }, extra);
    }
    if (status === 429) {
      return json(env, request, 429, { error: 'Groq rate-limited this request. Try again later.', code: 'rate-limited' }, extra);
    }
    return json(
      env,
      request,
      503,
      {
        error: message || 'The AI assistant is unavailable. Existing image tools still work in your browser.',
        code: 'unavailable',
      },
      extra,
    );
  }
}

async function runSeo(env: WorkerEnv, body: JsonBody) {
  const imageDataUrl = asString(body.imageDataUrl).replace(/\s/g, '');
  const productDetails = asString(body.productDetails).slice(0, MAX_TEXT);
  if (!DATA_URL_PATTERN.test(imageDataUrl) || imageDataUrl.length > MAX_DATA_URL_CHARS) {
    throw Object.assign(new Error('Upload an image first, then generate SEO text.'), { status: 400 });
  }

  const content = await groqChat({
    apiKey: env.GROQ_API_KEY ?? '',
    model: env.VISION_MODEL ?? VISION_MODEL,
    json: true,
    messages: [
      {
        role: 'system',
        content:
          'You write concise image SEO drafts. Return JSON with keys altText, fileName, title, caption, and optional productListing. fileName must be lowercase kebab-case without a path. Do not claim search rankings. Do not mention being an AI.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe this image for alt text, an SEO filename, a title and a caption.${
              productDetails ? ` Product details from the user: ${productDetails}` : ''
            }`,
          },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const parsed = parseJsonObject(content);
  return {
    altText: asString(parsed.altText) || 'Descriptive alt text was not returned.',
    fileName: sanitizeFileName(asString(parsed.fileName)),
    title: asString(parsed.title) || 'Untitled image',
    caption: asString(parsed.caption) || 'No caption was returned.',
    productListing: asString(parsed.productListing) || undefined,
  };
}

async function runAdvise(env: WorkerEnv, body: JsonBody) {
  const intendedUse = asString(body.intendedUse).slice(0, 200);
  if (!intendedUse) {
    throw Object.assign(new Error('Describe the intended use.'), { status: 400 });
  }

  const content = await groqChat({
    apiKey: env.GROQ_API_KEY ?? '',
    model: env.TEXT_MODEL ?? TEXT_MODEL,
    json: true,
    messages: [
      {
        role: 'system',
        content:
          'You recommend browser-side image settings. Return JSON with recommendedFormat (jpeg, png or webp), optional recommendedWidth, recommendedHeight, recommendedQuality (0.1-1), rationale, and caveats (array of strings). Never present recommendations as measured results. Prefer webp for photos, png for sharp graphics with transparency, jpeg when compatibility matters.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          intendedUse,
          targetBytes: body.targetBytes,
          width: body.width,
          height: body.height,
          sourceFormat: body.sourceFormat,
          originalBytes: body.originalBytes,
          hasTransparency: body.hasTransparency,
        }),
      },
    ],
  });

  const parsed = parseJsonObject(content);
  const format = asString(parsed.recommendedFormat).toLowerCase();
  const recommendedFormat =
    format === 'png' || format === 'jpeg' || format === 'jpg' || format === 'webp'
      ? format === 'jpg'
        ? 'jpeg'
        : format
      : 'webp';
  const quality = asNumber(parsed.recommendedQuality);

  return {
    recommendedFormat,
    recommendedWidth: asNumber(parsed.recommendedWidth),
    recommendedHeight: asNumber(parsed.recommendedHeight),
    recommendedQuality: quality !== undefined ? Math.min(1, Math.max(0.1, quality)) : undefined,
    rationale: asString(parsed.rationale) || 'No rationale was returned.',
    caveats: asStringArray(parsed.caveats),
  };
}

function sanitizeFileName(value: string): string {
  const base = value.replace(/\.[a-z0-9]+$/i, '').toLowerCase();
  const kebab = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return kebab || 'image';
}
