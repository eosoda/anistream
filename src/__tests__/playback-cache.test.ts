import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  systemSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));
const redis = vi.hoisted(() => ({
  redisGetJson: vi.fn(),
  redisGet: vi.fn(),
  redisPing: vi.fn(),
  redisSetJson: vi.fn(),
  redisSetIfAbsent: vi.fn(),
  redisDeleteIfValue: vi.fn(),
  redisIncrement: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/kenjitsu/settings', () => ({
  KENJITSU_BETA_ALLOWLIST: ['anikoto'],
  getEnabledKenjitsuExtensions: vi.fn().mockResolvedValue(['anikoto']),
}));
vi.mock('@/lib/cache/redis', () => redis);

import {
  getDefaultPlaybackCacheSettings,
  getPlaybackCache,
  setPlaybackCache,
  withPlaybackCacheLock,
} from '@/lib/streams/playback-cache';

describe('playback source cache', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.clearAllMocks();
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    redis.redisGetJson.mockResolvedValue(null);
    redis.redisGet.mockResolvedValue(null);
    redis.redisPing.mockResolvedValue(true);
    redis.redisSetJson.mockResolvedValue(true);
    redis.redisSetIfAbsent.mockResolvedValue(true);
    redis.redisDeleteIfValue.mockResolvedValue(true);
  });

  it('limits source TTL to 240 seconds and keeps URLs out of the public cache contract', async () => {
    const result = {
      selected: {
        id: 'source-1', provider: 'AniKoto', url: 'https://cdn.example/source.m3u8', type: 'hls' as const,
        expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      },
      alternatives: [], attempts: [], phase: 'fast' as const, alternativesPending: true, cacheHit: false,
    };

    await setPlaybackCache({ animeId: '1', season: 1, episode: 1 }, 'fast', result);
    expect(redis.redisSetJson).toHaveBeenCalled();
    expect(redis.redisSetJson.mock.calls[0][2]).toBe(240);

    const publicResult = await getPlaybackCache({ animeId: '1', season: 1, episode: 1 }, 'fast');
    expect(publicResult).toBeNull();
  });

  it('uses a distributed lock and releases only its own token', async () => {
    const work = vi.fn().mockResolvedValue('done');
    await expect(withPlaybackCacheLock({ animeId: '1', season: 1, episode: 1 }, 'fast', work)).resolves.toBe('done');
    expect(redis.redisSetIfAbsent).toHaveBeenCalledWith(expect.stringContaining(':lock'), expect.any(String), 30);
    expect(redis.redisDeleteIfValue).toHaveBeenCalledWith(expect.stringContaining(':lock'), expect.any(String));
  });

  it('ships with the safe beta defaults', () => {
    const settings = getDefaultPlaybackCacheSettings();
    expect(settings.sourceTtlSeconds).toBe(240);
    expect(settings.metadataTtlSeconds).toBe(300);
    expect(settings.preCacheNextEpisode).toBe(false);
  });
});
