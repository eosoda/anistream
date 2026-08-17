import { NextRequest } from 'next/server';
import { redisIncrement } from '@/lib/cache/redis';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
  backend: 'redis' | 'memory' | 'unavailable';
}

/**
 * Only the configured reverse-proxy header is trusted in production. The
 * proxy must remove this header from client requests before forwarding them.
 */
export function getClientIp(request: NextRequest): string {
  const trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER?.trim();
  if (trustedHeader) return request.headers.get(trustedHeader)?.split(',')[0].trim() || 'unknown';
  if (process.env.NODE_ENV !== 'production') {
    return request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  }
  return 'unknown';
}

function checkMemoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (memoryStore.size > 10000) {
    for (const [storedKey, stored] of memoryStore) {
      if (stored.resetAt <= now) memoryStore.delete(storedKey);
    }
  }

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: Math.max(0, options.limit - 1), resetMs: options.windowMs, limit: options.limit, backend: 'memory' };
  }

  if (record.count >= options.limit) {
    return { allowed: false, remaining: 0, resetMs: Math.max(0, record.resetAt - now), limit: options.limit, backend: 'memory' };
  }

  record.count += 1;
  return { allowed: true, remaining: Math.max(0, options.limit - record.count), resetMs: Math.max(0, record.resetAt - now), limit: options.limit, backend: 'memory' };
}

export function checkRateLimit(
  request: NextRequest,
  keyPrefix = 'global',
  options: RateLimitOptions = { limit: 60, windowMs: 60000 },
): RateLimitResult {
  return checkMemoryRateLimit(`${keyPrefix}:${getClientIp(request)}`, options);
}

export async function checkDistributedRateLimit(
  key: string,
  options: RateLimitOptions,
  config: { failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const count = await redisIncrement(`ratelimit:${key}`, windowSeconds);

  if (count === null) {
    if (config.failClosed) {
      return { allowed: false, remaining: 0, resetMs: options.windowMs, limit: options.limit, backend: 'unavailable' };
    }
    return checkMemoryRateLimit(`distributed:${key}`, options);
  }

  const resetMs = windowSeconds * 1000;
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetMs,
    limit: options.limit,
    backend: 'redis',
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.max(1, Math.ceil(result.resetMs / 1000))),
  };
  if (!result.allowed) headers['Retry-After'] = String(Math.max(1, Math.ceil(result.resetMs / 1000)));
  return headers;
}
