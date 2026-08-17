import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import {
  redisDeleteIfValue,
  redisGetJson,
  redisGet,
  redisIncrement,
  redisPing,
  redisSetIfAbsent,
  redisSetJson,
} from '@/lib/cache/redis';
import { KENJITSU_BETA_ALLOWLIST, getEnabledKenjitsuExtensions } from '@/lib/kenjitsu/settings';
import type { EpisodeLookupInput, ResolveStreamResult, StreamSource } from './types';

export const PLAYBACK_CACHE_SETTINGS_KEY = 'playback_cache_settings';
export const PLAYBACK_CACHE_VERSION_KEY = 'playback_cache_version';

export interface PlaybackCacheSettings {
  enabled: boolean;
  metadataTtlSeconds: number;
  sourceTtlSeconds: number;
  audioModes: Array<'sub' | 'dub'>;
  extensionIds: string[];
  concurrency: number;
  episodesPerAnime: number;
  homeSections: string[];
  preCacheNextEpisode: boolean;
  refreshIntervalMinutes: number;
}

const DEFAULT_PLAYBACK_CACHE_SETTINGS: PlaybackCacheSettings = {
  enabled: true,
  metadataTtlSeconds: 300,
  sourceTtlSeconds: 240,
  audioModes: ['sub'],
  extensionIds: [...KENJITSU_BETA_ALLOWLIST],
  concurrency: 4,
  episodesPerAnime: 1,
  homeSections: ['hero', 'trending', 'airing', 'popular'],
  preCacheNextEpisode: false,
  refreshIntervalMinutes: 30,
};

type CacheMode = 'fast' | 'complete';

const isCacheRuntimeEnabled = () => process.env.NODE_ENV !== 'test';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
}

function normalizeSettings(value: unknown): PlaybackCacheSettings {
  const input = value && typeof value === 'object' ? value as Partial<PlaybackCacheSettings> : {};
  const allowedExtensions = new Set(KENJITSU_BETA_ALLOWLIST);
  const extensionIds = Array.isArray(input.extensionIds)
    ? input.extensionIds.filter((id): id is string => typeof id === 'string' && allowedExtensions.has(id as never))
    : DEFAULT_PLAYBACK_CACHE_SETTINGS.extensionIds;
  const audioModes = Array.isArray(input.audioModes)
    ? input.audioModes.filter((mode): mode is 'sub' | 'dub' => mode === 'sub' || mode === 'dub')
    : DEFAULT_PLAYBACK_CACHE_SETTINGS.audioModes;

  return {
    enabled: input.enabled !== false,
    metadataTtlSeconds: clamp(input.metadataTtlSeconds, 30, 86400, DEFAULT_PLAYBACK_CACHE_SETTINGS.metadataTtlSeconds),
    sourceTtlSeconds: clamp(input.sourceTtlSeconds, 15, 240, DEFAULT_PLAYBACK_CACHE_SETTINGS.sourceTtlSeconds),
    audioModes: audioModes.length > 0 ? Array.from(new Set(audioModes)) : ['sub'],
    extensionIds: extensionIds.length > 0 ? Array.from(new Set(extensionIds)).sort() : [...DEFAULT_PLAYBACK_CACHE_SETTINGS.extensionIds],
    concurrency: clamp(input.concurrency, 1, 8, DEFAULT_PLAYBACK_CACHE_SETTINGS.concurrency),
    episodesPerAnime: clamp(input.episodesPerAnime, 1, 24, DEFAULT_PLAYBACK_CACHE_SETTINGS.episodesPerAnime),
    homeSections: Array.isArray(input.homeSections)
      ? input.homeSections.filter((section): section is string => typeof section === 'string').slice(0, 20)
      : [...DEFAULT_PLAYBACK_CACHE_SETTINGS.homeSections],
    preCacheNextEpisode: input.preCacheNextEpisode === true,
    refreshIntervalMinutes: clamp(input.refreshIntervalMinutes, 5, 1440, DEFAULT_PLAYBACK_CACHE_SETTINGS.refreshIntervalMinutes),
  };
}

let settingsSnapshot: { value: PlaybackCacheSettings; expiresAt: number } | null = null;
let versionSnapshot: { value: string; expiresAt: number } | null = null;
let extensionSnapshot: { value: string[]; expiresAt: number } | null = null;

export async function getPlaybackCacheSettings(): Promise<PlaybackCacheSettings> {
  if (!isCacheRuntimeEnabled()) return normalizeSettings(null);
  if (settingsSnapshot && settingsSnapshot.expiresAt > Date.now()) return settingsSnapshot.value;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: PLAYBACK_CACHE_SETTINGS_KEY } });
    const value = setting ? normalizeSettings(JSON.parse(setting.value)) : normalizeSettings(null);
    settingsSnapshot = { value, expiresAt: Date.now() + 10_000 };
    return value;
  } catch {
    return normalizeSettings(null);
  }
}

export async function savePlaybackCacheSettings(value: unknown): Promise<PlaybackCacheSettings> {
  const normalized = normalizeSettings(value);
  await prisma.systemSetting.upsert({
    where: { key: PLAYBACK_CACHE_SETTINGS_KEY },
    create: { key: PLAYBACK_CACHE_SETTINGS_KEY, value: JSON.stringify(normalized) },
    update: { value: JSON.stringify(normalized) },
  });
  settingsSnapshot = { value: normalized, expiresAt: Date.now() + 10_000 };
  await bumpPlaybackCacheVersion();
  return normalized;
}

export async function bumpPlaybackCacheVersion(): Promise<string> {
  const value = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  await prisma.systemSetting.upsert({
    where: { key: PLAYBACK_CACHE_VERSION_KEY },
    create: { key: PLAYBACK_CACHE_VERSION_KEY, value },
    update: { value },
  });
  versionSnapshot = { value, expiresAt: Date.now() + 10_000 };
  return value;
}

async function getPlaybackCacheVersion(): Promise<string> {
  if (!isCacheRuntimeEnabled()) return 'test';
  if (versionSnapshot && versionSnapshot.expiresAt > Date.now()) return versionSnapshot.value;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: PLAYBACK_CACHE_VERSION_KEY } });
    const value = setting?.value || 'initial';
    versionSnapshot = { value, expiresAt: Date.now() + 10_000 };
    return value;
  } catch {
    return 'initial';
  }
}

async function buildKey(input: EpisodeLookupInput, mode: CacheMode): Promise<string> {
  const [settings, version] = await Promise.all([
    getPlaybackCacheSettings(),
    getPlaybackCacheVersion(),
  ]);
  let enabledExtensions = extensionSnapshot?.expiresAt && extensionSnapshot.expiresAt > Date.now() ? extensionSnapshot.value : null;
  if (!enabledExtensions) {
    enabledExtensions = process.env.NODE_ENV === 'test' ? [] : await getEnabledKenjitsuExtensions().catch(() => []);
    extensionSnapshot = { value: enabledExtensions, expiresAt: Date.now() + 10_000 };
  }
  const extensionVersion = Array.from(new Set(enabledExtensions.length ? enabledExtensions : settings.extensionIds)).sort().join(',');
  const anime = input.animeId.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '_');
  const provider = (input.preferredProvider || 'default').trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '_');
  const audio = (input.preferredAudio || 'pt-BR').toLowerCase();
  return `anistream:playback:${version}:${extensionVersion}:${mode}:${anime}:s${input.season}:e${input.episode}:a${audio}:p${provider}`;
}

export async function getPlaybackCacheKey(input: EpisodeLookupInput, mode: CacheMode): Promise<string> {
  return buildKey(input, mode);
}

export async function getPlaybackCache(input: EpisodeLookupInput, mode: CacheMode): Promise<ResolveStreamResult | null> {
  if (!isCacheRuntimeEnabled()) return null;
  const settings = await getPlaybackCacheSettings();
  if (!settings.enabled) return null;
  const value = await redisGetJson<ResolveStreamResult>(await buildKey(input, mode));
  void redisIncrement(`anistream:playback:metric:${value ? 'hits' : 'misses'}`, 86400);
  return value;
}

function sourceExpiry(result: ResolveStreamResult): number | null {
  const expirations = [result.selected, ...result.alternatives]
    .map((source) => source?.expiresAt ? Date.parse(source.expiresAt) : NaN)
    .filter((value) => Number.isFinite(value));
  return expirations.length ? Math.min(...expirations) : null;
}

export async function setPlaybackCache(
  input: EpisodeLookupInput,
  mode: CacheMode,
  result: ResolveStreamResult,
): Promise<boolean> {
  if (!isCacheRuntimeEnabled()) return false;
  const settings = await getPlaybackCacheSettings();
  if (!settings.enabled || !result.selected) return false;
  const expiry = sourceExpiry(result);
  const maxTtl = expiry ? Math.max(1, Math.ceil((expiry - Date.now()) / 1000)) : settings.sourceTtlSeconds;
  const ttl = Math.max(1, Math.min(settings.sourceTtlSeconds, maxTtl, 240));
  return redisSetJson(await buildKey(input, mode), { ...result, cacheHit: false }, ttl);
}

export async function withPlaybackCacheLock<T>(
  input: EpisodeLookupInput,
  mode: CacheMode,
  work: () => Promise<T>,
  options: {
    readCached?: () => Promise<T | null>;
    waitTimeoutMs?: number;
  } = {},
): Promise<T> {
  if (!isCacheRuntimeEnabled()) return work();
  if (!(await getPlaybackCacheSettings()).enabled) return work();
  // A health probe distinguishes an unavailable Redis from an occupied lock.
  // This preserves the live-resolution fallback without waiting 30 seconds
  // during an outage.
  if (!(await redisPing())) return work();

  const key = await buildKey(input, mode);
  const lockKey = `${key}:lock`;
  const token = randomUUID();
  let acquired = await redisSetIfAbsent(lockKey, token, 30);

  if (!acquired) {
    const deadline = Date.now() + Math.max(250, Math.min(options.waitTimeoutMs ?? 30_000, 30_000));

    while (Date.now() < deadline) {
      const cached = await options.readCached?.().catch(() => null);
      if (cached != null) return cached;

      const currentLock = await redisGet(lockKey);
      if (currentLock == null) {
        acquired = await redisSetIfAbsent(lockKey, token, 30);
        if (acquired) break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  try {
    return await work();
  } finally {
    if (acquired) await redisDeleteIfValue(lockKey, token);
  }
}

export function clearPlaybackCacheSettingsSnapshot(): void {
  settingsSnapshot = null;
  versionSnapshot = null;
  extensionSnapshot = null;
}

export function getDefaultPlaybackCacheSettings(): PlaybackCacheSettings {
  return { ...DEFAULT_PLAYBACK_CACHE_SETTINGS, extensionIds: [...DEFAULT_PLAYBACK_CACHE_SETTINGS.extensionIds], audioModes: [...DEFAULT_PLAYBACK_CACHE_SETTINGS.audioModes], homeSections: [...DEFAULT_PLAYBACK_CACHE_SETTINGS.homeSections] };
}

export function getSourceCacheExpiry(result: ResolveStreamResult): Date | null {
  const expiry = sourceExpiry(result);
  return expiry ? new Date(expiry) : null;
}

export function sanitizeCacheError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Falha desconhecida');
  return message.replace(/https?:\/\/\S+/gi, '[url]').slice(0, 240);
}

export type CachedSourceSummary = Pick<StreamSource, 'provider' | 'type' | 'quality' | 'audioLanguage'>;
