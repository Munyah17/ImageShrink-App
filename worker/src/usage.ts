const memoryCounts = new Map<string, number>();

export type UsageStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl: number }): Promise<void>;
};

export async function hashIdentity(seed: string, ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${seed}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeDailyAllowance(options: {
  store?: UsageStore;
  ip: string;
  seed: string;
  limit: number;
}): Promise<{ allowed: boolean; remaining: number; limit: number; durable: boolean }> {
  const day = new Date().toISOString().slice(0, 10);
  const identity = await hashIdentity(options.seed, options.ip);
  const key = `ai:${day}:${identity}`;

  if (options.store) {
    const current = Number((await options.store.get(key)) ?? '0');
    if (current >= options.limit) {
      return { allowed: false, remaining: 0, limit: options.limit, durable: true };
    }
    await options.store.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - current - 1),
      limit: options.limit,
      durable: true,
    };
  }

  const memoryKey = key;
  const current = memoryCounts.get(memoryKey) ?? 0;
  if (current >= options.limit) {
    return { allowed: false, remaining: 0, limit: options.limit, durable: false };
  }
  memoryCounts.set(memoryKey, current + 1);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current - 1),
    limit: options.limit,
    durable: false,
  };
}
