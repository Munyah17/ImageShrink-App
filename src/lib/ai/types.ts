export type AiSeoResult = {
  altText: string;
  fileName: string;
  title: string;
  caption: string;
  productListing?: string;
};

export type AiAdvisorResult = {
  recommendedFormat: 'jpeg' | 'png' | 'webp';
  recommendedWidth?: number;
  recommendedHeight?: number;
  recommendedQuality?: number;
  rationale: string;
  caveats: string[];
};

export type AiErrorCode =
  | 'unavailable'
  | 'rate-limited'
  | 'quota'
  | 'validation'
  | 'consent'
  | 'timeout'
  | 'unknown';

export type AiResponse<T> =
  | { ok: true; data: T; remaining?: number; limit?: number }
  | { ok: false; error: string; code: AiErrorCode; remaining?: number; limit?: number };
