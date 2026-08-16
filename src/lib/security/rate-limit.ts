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

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkMemoryRateLimit(
  key: string,
  options: RateLimitOptions,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetMs: options.windowMs,
    };
  }

  if (record.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - record.count),
    resetMs: Math.max(0, record.resetAt - now),
  };
}

export function checkRateLimit(
  request: NextRequest,
  keyPrefix = 'global',
  options: RateLimitOptions = { limit: 60, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetMs: number } {
  const ip = getClientIp(request);

  const key = `${keyPrefix}:${ip}`;
  return checkMemoryRateLimit(key, options);
}

export async function checkDistributedRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
  const count = await redisIncrement(`ratelimit:${key}`, windowSeconds);

  if (count === null) {
    return checkMemoryRateLimit(`distributed:${key}`, options);
  }

  const resetMs = windowSeconds * 1000;
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetMs,
  };
}
