import { NextRequest } from 'next/server';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(
  request: NextRequest,
  keyPrefix = 'global',
  options: RateLimitOptions = { limit: 60, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetMs: number } {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetMs: options.windowMs,
    };
  }

  if (record.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: record.resetAt - now,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetMs: record.resetAt - now,
  };
}
