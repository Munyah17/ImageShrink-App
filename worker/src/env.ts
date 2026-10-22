export type D1Prepared = {
  bind(...values: (string | number | null)[]): D1Prepared;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
};

export type D1Database = {
  prepare(query: string): D1Prepared;
};

export type WorkerEnv = {
  GROQ_API_KEY?: string;
  DAILY_REQUEST_LIMIT?: string;
  RATE_SALT?: string;
  ALLOWED_ORIGIN?: string;
  VISION_MODEL?: string;
  TEXT_MODEL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PLUS?: string;
  STRIPE_PRICE_PRO?: string;
  APP_ORIGIN?: string;
  DB?: D1Database;
  USAGE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
  };
};
