import { describe, expect, it, vi } from 'vitest';

const redisIncrement = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cache/redis', () => ({ redisIncrement }));

import { checkDistributedRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';

describe('distributed rate limit', () => {
  it('uses Redis counts and emits standard headers', async () => {
    redisIncrement.mockResolvedValue(3);
    const result = await checkDistributedRateLimit('test', { limit: 5, windowMs: 60_000 });
    expect(result).toMatchObject({ allowed: true, remaining: 2, backend: 'redis' });
    expect(redisIncrement).toHaveBeenCalledWith('ratelimit:test', 60);
    expect(rateLimitHeaders(result)).toMatchObject({ 'RateLimit-Limit': '5', 'RateLimit-Remaining': '2' });
  });

  it('fails closed when Redis is unavailable for sensitive flows', async () => {
    redisIncrement.mockResolvedValue(null);
    const result = await checkDistributedRateLimit('sensitive', { limit: 5, windowMs: 60_000 }, { failClosed: true });
    expect(result).toMatchObject({ allowed: false, remaining: 0, backend: 'unavailable' });
    expect(rateLimitHeaders(result)['Retry-After']).toBe('60');
  });
});
