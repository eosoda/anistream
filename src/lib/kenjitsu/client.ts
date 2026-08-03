import { env } from '@/env';
import { redisGetJson, redisSetJson } from '@/lib/cache/redis';
import type {
  KenjitsuExtensionHealth,
  KenjitsuExtensionId,
  KenjitsuExtensionInfo,
  KenjitsuExtensionSearchItem,
  KenjitsuMetaAnime,
  KenjitsuProviderId,
  KenjitsuProviderEpisode,
  KenjitsuResponse,
  KenjitsuVideoData,
} from './types';

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class KenjitsuRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'KenjitsuRequestError';
  }
}

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function buildUrl(path: string): string {
  return new URL(path.replace(/^\/+/, '/'), `${env.KENJITSU_BASE_URL.replace(/\/+$/, '')}/`).toString();
}

function cacheKey(path: string): string {
  return `${env.KENJITSU_BASE_URL}|${path}`;
}

async function requestJson<T>(path: string, ttlMs = 0): Promise<T> {
  const key = cacheKey(path);
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }
  if (cached) responseCache.delete(key);

  if (ttlMs > 0) {
    const distributed = await redisGetJson<T>(`kenjitsu:${key}`);
    if (distributed !== null) {
      responseCache.set(key, { expiresAt: Date.now() + ttlMs, value: distributed });
      return distributed;
    }
  }

  const pending = inFlightRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.KENJITSU_REQUEST_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (env.KENJITSU_API_KEY) headers['x-api-key'] = env.KENJITSU_API_KEY;

      const response = await fetch(buildUrl(path), {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error?: unknown }).error)
            : `Kenjitsu respondeu HTTP ${response.status}`;
        throw new KenjitsuRequestError(message, response.status, payload);
      }

      if (ttlMs > 0) {
        responseCache.set(key, { expiresAt: Date.now() + ttlMs, value: payload });
        await redisSetJson(`kenjitsu:${key}`, payload, ttlMs / 1000);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof KenjitsuRequestError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new KenjitsuRequestError('Tempo limite ao consultar o Kenjitsu', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  inFlightRequests.set(key, request);
  try {
    return await request;
  } finally {
    inFlightRequests.delete(key);
  }
}

const seconds = (value: number) => value * 1000;

export const kenjitsuClient = {
  searchMetadata(query: string, page = 1, perPage = 24) {
    const params = new URLSearchParams({ q: query, page: String(page), perPage: String(perPage) });
    return requestJson<KenjitsuResponse<KenjitsuMetaAnime[]>>(
      `/api/anilist/anime/search?${params.toString()}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getMetadata(anilistId: number) {
    return requestJson<KenjitsuResponse<KenjitsuMetaAnime>>(
      `/api/anilist/anime/${encodeURIComponent(String(anilistId))}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getTop(category: 'airing' | 'trending' | 'upcoming' | 'popular' | 'rating', page = 1, perPage = 24) {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    return requestJson<KenjitsuResponse<KenjitsuMetaAnime[]>>(
      `/api/anilist/anime/top/${category}?${params.toString()}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getSeason(season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL', year: number, page = 1, perPage = 24) {
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage), format: 'TV' });
    return requestJson<KenjitsuResponse<KenjitsuMetaAnime[]>>(
      `/api/anilist/seasons/${season}/${year}?${params.toString()}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getCharacters(anilistId: number) {
    return requestJson<KenjitsuResponse<unknown>>(
      `/api/anilist/anime/${encodeURIComponent(String(anilistId))}/characters`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getRelated(anilistId: number) {
    return requestJson<KenjitsuResponse<unknown[]>>(
      `/api/anilist/anime/${encodeURIComponent(String(anilistId))}/related`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getMapping(anilistId: number, extensionId: KenjitsuExtensionId) {
    const params = new URLSearchParams({ provider: extensionId });
    return requestJson<KenjitsuResponse<null> & { provider?: KenjitsuProviderId | null }>(
      `/api/anilist/anime/${encodeURIComponent(String(anilistId))}/mappings?${params.toString()}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  searchExtension(extensionId: KenjitsuExtensionId, query: string, page = 1) {
    const params = new URLSearchParams({ q: query, page: String(page) });
    return requestJson<KenjitsuResponse<KenjitsuExtensionSearchItem[]>>(
      `/api/extensions/${extensionId}/search?${params.toString()}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getExtensionInfo(extensionId: KenjitsuExtensionId, providerId: string | number) {
    return requestJson<KenjitsuResponse<KenjitsuExtensionInfo> & { provider?: string; providerEpisodes?: KenjitsuProviderEpisode[] }>(
      `/api/extensions/${extensionId}/anime/${encodeURIComponent(String(providerId))}`,
      seconds(env.KENJITSU_CACHE_TTL_SECONDS),
    );
  },

  getExtensionSources(
    extensionId: KenjitsuExtensionId,
    episodeId: string,
    version: 'sub' | 'dub' | 'raw' = 'sub',
    server?: string,
  ) {
    const params = new URLSearchParams({ episodeId, version });
    if (server) params.set('server', server);
    return requestJson<KenjitsuResponse<KenjitsuVideoData> & { headers?: { Referer?: string | null } }>(
      `/api/extensions/${extensionId}/sources?${params.toString()}`,
      0,
    );
  },

  getExtensionHealth() {
    return requestJson<KenjitsuResponse<KenjitsuExtensionHealth[]>>('/api/extensions/health', 0);
  },
};

export function clearKenjitsuCache(): void {
  responseCache.clear();
}
