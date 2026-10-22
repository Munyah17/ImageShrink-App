import type { AiAdvisorResult, AiErrorCode, AiResponse, AiSeoResult } from './types';

const DEFAULT_ERROR: Record<number, { code: AiErrorCode; error: string }> = {
  400: { code: 'validation', error: 'The AI request was rejected because the input was invalid.' },
  403: { code: 'consent', error: 'Consent is required before image data can be sent to Groq.' },
  413: { code: 'validation', error: 'The image is too large to send to the AI assistant.' },
  429: { code: 'rate-limited', error: 'The AI assistant is temporarily rate limited. Try again later.' },
  503: { code: 'unavailable', error: 'The AI assistant is unavailable. Compression and conversion still work in your browser.' },
};

async function requestAi<T>(path: string, body: unknown): Promise<AiResponse<T>> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    const limitHeader = response.headers.get('X-RateLimit-Limit');
    const remaining = remainingHeader ? Number(remainingHeader) : undefined;
    const limit = limitHeader ? Number(limitHeader) : undefined;

    let payload: { error?: string; code?: AiErrorCode; data?: T } = {};
    try {
      payload = (await response.json()) as { error?: string; code?: AiErrorCode; data?: T };
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const fallback = DEFAULT_ERROR[response.status] ?? {
        code: 'unknown' as const,
        error: 'The AI assistant could not complete this request.',
      };
      return {
        ok: false,
        error: payload.error ?? fallback.error,
        code: payload.code ?? fallback.code,
        remaining,
        limit,
      };
    }

    if (!payload.data) {
      return {
        ok: false,
        error: 'The AI assistant returned an empty response.',
        code: 'unknown',
        remaining,
        limit,
      };
    }

    return { ok: true, data: payload.data, remaining, limit };
  } catch {
    return {
      ok: false,
      error: 'Could not reach the AI assistant. Browser-side image tools are unaffected.',
      code: 'unavailable',
    };
  }
}

export async function generateSeoCopy(input: {
  imageDataUrl: string;
  mimeType: string;
  consent: boolean;
  productDetails?: string;
}): Promise<AiResponse<AiSeoResult>> {
  return requestAi<AiSeoResult>('/api/ai/seo', input);
}

export async function generateAdvice(input: {
  intendedUse: string;
  targetBytes?: number;
  width?: number;
  height?: number;
  sourceFormat?: string;
  originalBytes?: number;
  hasTransparency?: boolean;
  consent: boolean;
}): Promise<AiResponse<AiAdvisorResult>> {
  return requestAi<AiAdvisorResult>('/api/ai/advise', input);
}

export async function downscaleForAi(file: File, maxEdge = 720): Promise<string> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not prepare a preview for the AI assistant.');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    if (!dataUrl.startsWith('data:image/jpeg')) {
      throw new Error('Your browser could not create a JPEG preview for Groq.');
    }
    return dataUrl;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Could not read this image for the AI assistant.');
  } finally {
    bitmap?.close();
  }
}
