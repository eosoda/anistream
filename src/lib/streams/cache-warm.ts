import { prisma } from '@/lib/db/prisma';
import { redisListPop, redisListPush, redisIncrement, redisGet } from '@/lib/cache/redis';
import { defaultStreamResolver } from './resolver';
import {
  getDefaultPlaybackCacheSettings,
  getPlaybackCacheSettings,
  getSourceCacheExpiry,
  sanitizeCacheError,
} from './playback-cache';
import type { EpisodeLookupInput } from './types';

export const PLAYBACK_WARM_QUEUE_KEY = 'anistream:playback:warm:queue';

export interface CacheStateSummary {
  episodeId: string;
  status: string;
  audioMode: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  expiresAt: string | null;
  sourceCount: number;
  lastError: string | null;
}

function serializeState(state: {
  episodeId: string;
  status: string;
  audioMode: string;
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  expiresAt: Date | null;
  sourceCount: number;
  lastError: string | null;
}): CacheStateSummary {
  return {
    episodeId: state.episodeId,
    status: state.status,
    audioMode: state.audioMode,
    lastAttemptAt: state.lastAttemptAt?.toISOString() || null,
    lastSuccessAt: state.lastSuccessAt?.toISOString() || null,
    expiresAt: state.expiresAt?.toISOString() || null,
    sourceCount: state.sourceCount,
    lastError: state.lastError,
  };
}

async function loadEpisodeInput(episodeId: string, audioMode: 'sub' | 'dub'): Promise<EpisodeLookupInput | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { anime: { include: { aliases: true } } },
  });
  if (!episode) return null;

  return {
    animeId: episode.animeId,
    season: episode.season,
    episode: episode.number,
    preferredAudio: audioMode === 'dub' ? 'pt-BR' : 'ja',
    animeTitle: episode.anime.title,
    originalTitle: episode.anime.originalTitle || undefined,
    aliases: Array.from(new Set([
      episode.anime.title,
      episode.anime.originalTitle || '',
      ...episode.anime.aliases.map((alias) => alias.value),
    ])).filter(Boolean),
    resolutionMode: 'complete',
  };
}

export async function warmEpisodeCacheById(
  episodeId: string,
  options: { audioMode?: 'sub' | 'dub' } = {},
): Promise<CacheStateSummary | null> {
  const audioMode = options.audioMode || 'sub';
  const input = await loadEpisodeInput(episodeId, audioMode);
  if (!input) return null;

  const now = new Date();
  await prisma.episodeCacheState.upsert({
    where: { episodeId },
    create: { episodeId, status: 'warming', audioMode, lastAttemptAt: now, lastError: null },
    update: { status: 'warming', audioMode, lastAttemptAt: now, lastError: null },
  });

  try {
    const result = await defaultStreamResolver.resolveEpisodeStream(input, 9000, { mode: 'complete' });
    if (!result.selected) {
      const failed = await prisma.episodeCacheState.update({
        where: { episodeId },
        data: { status: 'empty', sourceCount: 0, lastError: 'Nenhuma fonte reproduzível encontrada.', expiresAt: null },
      });
      return serializeState(failed);
    }

    const expiry = getSourceCacheExpiry(result);
    const cacheSettings = await getPlaybackCacheSettings().catch(() => getDefaultPlaybackCacheSettings());
    const extensionIds = cacheSettings.extensionIds;
    const ready = await prisma.episodeCacheState.update({
      where: { episodeId },
      data: {
        status: 'ready',
        audioMode,
        extensionIdsJson: JSON.stringify(extensionIds),
        lastSuccessAt: new Date(),
        expiresAt: expiry,
        sourceCount: 1 + result.alternatives.length,
        lastError: null,
      },
    });
    return serializeState(ready);
  } catch (error) {
    const failed = await prisma.episodeCacheState.update({
      where: { episodeId },
      data: { status: 'error', lastError: sanitizeCacheError(error) },
    });
    return serializeState(failed);
  }
}

export async function warmEpisodeIds(
  episodeIds: string[],
  options: { audioMode?: 'sub' | 'dub'; concurrency?: number } = {},
): Promise<{ completed: number; failed: number; states: CacheStateSummary[] }> {
  const settings = await getPlaybackCacheSettings().catch(() => getDefaultPlaybackCacheSettings());
  const concurrency = Math.max(1, Math.min(options.concurrency || settings.concurrency, 8));
  const states: CacheStateSummary[] = [];
  let cursor = 0;
  let failed = 0;

  const worker = async () => {
    while (cursor < episodeIds.length) {
      const index = cursor;
      cursor += 1;
      const state = await warmEpisodeCacheById(episodeIds[index], options);
      if (state) {
        states.push(state);
        if (state.status === 'error' || state.status === 'empty') failed += 1;
      } else {
        failed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, episodeIds.length)) }, () => worker()));
  return { completed: states.filter((state) => state.status === 'ready').length, failed, states };
}

export async function enqueueWarmTask(taskId: string): Promise<boolean> {
  return redisListPush(PLAYBACK_WARM_QUEUE_KEY, taskId);
}

export async function runNextWarmTask(): Promise<{ taskId: string | null; completed: number; failed: number }> {
  const queuedId = await redisListPop(PLAYBACK_WARM_QUEUE_KEY);
  const task = queuedId
    ? await prisma.playbackCacheWarmTask.findUnique({ where: { id: queuedId } })
    : await prisma.playbackCacheWarmTask.findFirst({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } });

  if (!task) return { taskId: null, completed: 0, failed: 0 };

  let options: { episodeIds?: string[]; audioMode?: 'sub' | 'dub'; concurrency?: number } = {};
  try { options = task.optionsJson ? JSON.parse(task.optionsJson) : {}; } catch { options = {}; }
  const episodeIds = Array.isArray(options.episodeIds) ? options.episodeIds.filter((id): id is string => typeof id === 'string') : [];
  await prisma.playbackCacheWarmTask.update({ where: { id: task.id }, data: { status: 'running', startedAt: new Date(), total: episodeIds.length } });

  let completed = 0;
  let failed = 0;
  try {
    for (const episodeId of episodeIds) {
      const state = await warmEpisodeCacheById(episodeId, { audioMode: options.audioMode });
      if (state?.status === 'ready') completed += 1;
      else failed += 1;
      await prisma.playbackCacheWarmTask.update({ where: { id: task.id }, data: { completed, failed } });
    }
    await prisma.playbackCacheWarmTask.update({ where: { id: task.id }, data: { status: 'completed', completedAt: new Date(), completed, failed } });
  } catch (error) {
    await prisma.playbackCacheWarmTask.update({ where: { id: task.id }, data: { status: 'error', lastError: sanitizeCacheError(error), completedAt: new Date(), completed, failed } });
  }

  return { taskId: task.id, completed, failed };
}

export async function getPlaybackCacheMetrics() {
  const [hits, misses, states, tasks] = await Promise.all([
    redisGet('anistream:playback:metric:hits'),
    redisGet('anistream:playback:metric:misses'),
    prisma.episodeCacheState.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 }),
    prisma.playbackCacheWarmTask.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const byStatus = states.reduce<Record<string, number>>((result, state) => {
    result[state.status] = (result[state.status] || 0) + 1;
    return result;
  }, {});
  return {
    hits: Number(hits || 0),
    misses: Number(misses || 0),
    warmedItems: byStatus.ready || 0,
    failures: (byStatus.error || 0) + (byStatus.empty || 0),
    byStatus,
    states: states.slice(0, 50).map(serializeState),
    tasks,
  };
}

export async function selectWarmEpisodeIds(scope: string, requestedIds: string[] = []): Promise<string[]> {
  if (requestedIds.length > 0) {
    const episodes = await prisma.episode.findMany({ where: { id: { in: requestedIds.slice(0, 500) } }, select: { id: true } });
    return episodes.map((episode) => episode.id);
  }

  const settings = await getPlaybackCacheSettings().catch(() => getDefaultPlaybackCacheSettings());
  const limit = scope === 'home' ? Math.max(4, settings.episodesPerAnime * 8) : Math.max(12, settings.episodesPerAnime * 20);
  const episodes = await prisma.episode.findMany({
    where: scope === 'home' ? { anime: { episodes: { some: {} } } } : undefined,
    orderBy: { publishedAt: 'desc' },
    take: Math.min(limit, 200),
    select: { id: true },
  });
  return episodes.map((episode) => episode.id);
}

export async function incrementPlaybackMetric(kind: 'hits' | 'misses'): Promise<void> {
  await redisIncrement(`anistream:playback:metric:${kind}`, 86400);
}
