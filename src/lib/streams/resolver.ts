import { AnimeProvider } from '../providers/provider.interface';
import {
  EpisodeLookupInput,
  ResolveStreamResult,
  StreamSource,
  ProviderAttempt,
} from './types';
import { validateStreamSource } from './validator';
import { mapWithConcurrency } from '../kenjitsu/concurrency';

import { KenjitsuProvider } from '../providers/kenjitsu.provider';
import {
  getPlaybackCache,
  setPlaybackCache,
  withPlaybackCacheLock,
} from './playback-cache';

export class StreamResolver {
  private providers: AnimeProvider[] = [];
  private readonly fastCache = new Map<
    string,
    { expiresAt: number; result: ResolveStreamResult }
  >();
  private readonly fastInFlight = new Map<string, Promise<ResolveStreamResult>>();
  private readonly fastCacheTtlMs = 60_000;
  private readonly fastCacheMaxEntries = 200;

  constructor(customProviders?: AnimeProvider[]) {
    if (customProviders && customProviders.length > 0) {
      this.providers = customProviders;
    } else {
      this.providers = [new KenjitsuProvider()];
    }
  }

  public registerProvider(provider: AnimeProvider): void {
    this.providers.push(provider);
  }

  async resolveEpisodeStream(
    input: EpisodeLookupInput,
    timeoutPerProviderMs = input.resolutionMode === 'fast' ? 4500 : 9000,
    options: { mode?: 'fast' | 'complete'; validationTimeoutMs?: number } = {}
  ): Promise<ResolveStreamResult> {
    const mode = options.mode ?? input.resolutionMode ?? 'complete';
    const readCached = async (): Promise<ResolveStreamResult | null> => {
      const cached = await getPlaybackCache(input, mode).catch(() => null);
      if (!cached?.selected) return null;
      return {
        ...cached,
        attempts: cached.attempts.map((attempt) => ({ ...attempt })),
        cacheHit: true,
      };
    };

    const cached = await readCached();
    if (cached) return cached;

    return withPlaybackCacheLock(input, mode, async () => {
      // Another web instance may have filled Redis while this request was
      // waiting for the lock. Always check again before calling extensions.
      const afterLock = await readCached();
      if (afterLock) return afterLock;

      const result = await this.resolveEpisodeStreamUncached(input, timeoutPerProviderMs, options);
      if (result.selected) {
        await setPlaybackCache(input, mode, result).catch(() => false);
      }
      return result;
    }, { readCached });
  }

  private async resolveEpisodeStreamUncached(
    input: EpisodeLookupInput,
    timeoutPerProviderMs: number,
    options: { mode?: 'fast' | 'complete'; validationTimeoutMs?: number },
  ): Promise<ResolveStreamResult> {
    const mode = options.mode ?? input.resolutionMode ?? 'complete';

    if (mode === 'fast') {
      const cacheKey = this.getFastCacheKey(input);
      const cached = this.fastCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          ...cached.result,
          attempts: cached.result.attempts.map((attempt) => ({ ...attempt })),
          cacheHit: true,
        };
      }
      if (cached) this.fastCache.delete(cacheKey);

      const inFlight = this.fastInFlight.get(cacheKey);
      if (inFlight) {
        const result = await inFlight;
        return {
          ...result,
          attempts: result.attempts.map((attempt) => ({ ...attempt })),
          cacheHit: true,
        };
      }

      const promise = this.resolveFast(
        input,
        timeoutPerProviderMs,
        options.validationTimeoutMs ?? 1800
      );
      this.fastInFlight.set(cacheKey, promise);

      try {
        const result = await promise;
        if (result.selected) this.storeFastCache(cacheKey, result);
        return result;
      } finally {
        this.fastInFlight.delete(cacheKey);
      }
    }

    return this.resolveComplete(input, timeoutPerProviderMs);
  }

  private getFastCacheKey(input: EpisodeLookupInput): string {
    return [
      input.animeId.trim().toLowerCase(),
      input.season,
      input.episode,
      input.preferredAudio || 'pt-BR',
      input.preferredProvider?.trim().toLowerCase() || 'default',
    ].join('|');
  }

  private storeFastCache(key: string, result: ResolveStreamResult): void {
    while (this.fastCache.size >= this.fastCacheMaxEntries) {
      const oldestKey = this.fastCache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.fastCache.delete(oldestKey);
    }
    this.fastCache.set(key, {
      expiresAt: Date.now() + this.fastCacheTtlMs,
      result: {
        ...result,
        attempts: result.attempts.map((attempt) => ({ ...attempt })),
        cacheHit: false,
      },
    });
  }

  private async enrichInput(input: EpisodeLookupInput): Promise<void> {
    if (!input.animeId || (input.animeTitle && input.aliases?.length)) return;

    try {
      const { prisma } = await import('../db/prisma');
      const dbAnime = await prisma.anime.findFirst({
        where: {
          OR: [
            { id: input.animeId },
            { slug: input.animeId },
            { identifiers: { some: { value: input.animeId } } },
          ],
        },
        include: { aliases: true },
      });

      if (dbAnime) {
        input.animeTitle = input.animeTitle || dbAnime.title;
        input.originalTitle = input.originalTitle || dbAnime.originalTitle || undefined;
        const aliasValues = dbAnime.aliases.map((alias: { value: string }) => alias.value);
        input.aliases = Array.from(
          new Set([
            ...(input.aliases || []),
            dbAnime.title,
            dbAnime.originalTitle || '',
            ...aliasValues,
          ])
        ).filter(Boolean);
      }
    } catch {
      // A source lookup must remain usable when the local metadata database is unavailable.
    }
  }

  private matchesPreferredProvider(source: StreamSource, preferredProvider?: string): boolean {
    if (!preferredProvider) return true;
    const preferred = preferredProvider.trim().toLocaleLowerCase('pt-BR');
    const provider = source.provider.trim().toLocaleLowerCase('pt-BR');
    return provider === preferred || provider.includes(preferred) || preferred.includes(provider);
  }

  private async resolveFast(
    input: EpisodeLookupInput,
    timeoutPerProviderMs: number,
    validationTimeoutMs: number
  ): Promise<ResolveStreamResult> {
    const attempts: ProviderAttempt[] = [];
    await this.enrichInput(input);
    const sharedController = new AbortController();

    const tasks = this.providers.map(async (provider) => {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutPerProviderMs);
      const abortFromWinner = () => controller.abort(sharedController.signal.reason);
      sharedController.signal.addEventListener('abort', abortFromWinner, { once: true });

      try {
        const sources = await provider.getEpisodeSources(input, controller.signal);
        const scopedSources = sources.filter((source) =>
          this.matchesPreferredProvider(source, input.preferredProvider)
        );

        if (!scopedSources.length) {
          throw new Error('Nenhuma fonte retornada pelo provedor');
        }

        // Validate a small, ordered window only. The complete pass is reserved for
        // the alternatives request, so the first playable source can win quickly.
        const candidates = scopedSources.slice(0, 6);
        const validations = (await mapWithConcurrency(candidates, async (source) => ({
            source,
            validation: await validateStreamSource(source, validationTimeoutMs),
          }), { concurrency: 4 })).filter((value): value is { source: StreamSource; validation: Awaited<ReturnType<typeof validateStreamSource>> } => Boolean(value));
        const playable = validations.find(({ validation }) => validation.valid);
        if (!playable) {
          throw new Error('Nenhuma fonte reproduzível no primeiro lote');
        }

        clearTimeout(timeoutId);
        sharedController.signal.removeEventListener('abort', abortFromWinner);
        attempts.push({
          provider: provider.id,
          success: true,
          durationMs: Date.now() - startTime,
          sourceCount: scopedSources.length,
        });

        return {
          selected: playable.source,
          alternatives: scopedSources.filter((source) => source.id !== playable.source.id),
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        sharedController.signal.removeEventListener('abort', abortFromWinner);
        attempts.push({
          provider: provider.id,
          success: false,
          durationMs: Date.now() - startTime,
          sourceCount: 0,
          error:
            err?.name === 'AbortError'
              ? `Timeout de ${timeoutPerProviderMs}ms excedido`
              : 'Falha ao consultar provedor',
        });
        throw err;
      }
    });

    try {
      const winner = await Promise.any(tasks);
      sharedController.abort(new DOMException('Outra fonte reproduzível foi encontrada', 'AbortError'));
      return {
        selected: winner.selected,
        alternatives: winner.alternatives,
        attempts,
        phase: 'fast',
        alternativesPending: true,
        cacheHit: false,
      };
    } catch {
      return {
        selected: null,
        alternatives: [],
        attempts,
        phase: 'fast',
        alternativesPending: false,
        cacheHit: false,
      };
    }
  }

  private async resolveComplete(
    input: EpisodeLookupInput,
    timeoutPerProviderMs: number
  ): Promise<ResolveStreamResult> {
    const attempts: ProviderAttempt[] = [];
    const rawSourcesMap = new Map<string, StreamSource>();
    await this.enrichInput(input);

    const providerPromises = this.providers.map(async (provider) => {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutPerProviderMs);

      try {
        const sources = await provider.getEpisodeSources(input, controller.signal);
        clearTimeout(timeoutId);
        attempts.push({
          provider: provider.id,
          success: true,
          durationMs: Date.now() - startTime,
          sourceCount: sources.length,
        });
        return sources;
      } catch (err: any) {
        clearTimeout(timeoutId);
        attempts.push({
          provider: provider.id,
          success: false,
          durationMs: Date.now() - startTime,
          sourceCount: 0,
          error:
            err?.name === 'AbortError'
              ? `Timeout de ${timeoutPerProviderMs}ms excedido`
              : 'Falha ao consultar provedor',
        });
        return [];
      }
    });

    const results = await Promise.allSettled(providerPromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        for (const source of result.value) {
          if (!rawSourcesMap.has(source.url)) rawSourcesMap.set(source.url, source);
        }
      }
    }

    const allSources = Array.from(rawSourcesMap.values());
    const validSources = (await mapWithConcurrency(allSources, async (source) => {
      const validation = await validateStreamSource(source, 3500);
      return validation.valid ? { source, latencyMs: validation.latencyMs } : null;
    }, { concurrency: 4 })).filter((value): value is { source: StreamSource; latencyMs: number } => Boolean(value));

    const preferredAudio = input.preferredAudio || 'pt-BR';
    const sortedSources = validSources
      .map(({ source, latencyMs }) => ({ source, latencyMs, score: calculateSourceScore(source, latencyMs, preferredAudio) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.source);
    const selected = sortedSources[0] || null;
    const alternatives = sortedSources.slice(1);

    return {
      selected,
      alternatives,
      attempts,
      phase: 'complete',
      alternativesPending: false,
      cacheHit: false,
    };
  }
}

/**
 * Calcula a pontuação de relevância e prioridade da fonte de vídeo:
 * 1. Idioma solicitado (peso +1000)
 * 2. Resolução (1080p: +500, 720p: +300, 480p: +100)
 * 3. HLS antes de MP4 (+200)
 * 4. Prioridade administrativa (+prioridade * 10)
 * 5. Menor latência (subtrai latência)
 */
function calculateSourceScore(
  source: StreamSource,
  latencyMs: number,
  preferredAudio: string
): number {
  let score = 0;

  // 1. Idioma preferido
  if (source.audioLanguage === preferredAudio) {
    score += 1000;
  } else if (source.audioLanguage === 'pt-BR') {
    score += 500;
  } else if (source.audioLanguage === 'ja') {
    score += 300;
  }

  // 2. Qualidade / Resolução
  const q = (source.quality || '').toLowerCase();
  if (q.includes('1080') || source.height === 1080) {
    score += 500;
  } else if (q.includes('720') || source.height === 720) {
    score += 300;
  } else if (q.includes('480') || source.height === 480) {
    score += 100;
  }

  // 3. Tipo de Stream: Preferir streams diretos HLS e MP4 sobre Embeds de terceiros
  if (source.type === 'hls') {
    score += 800;
  } else if (source.type === 'mp4') {
    score += 600;
  } else if (source.type === 'embed') {
    score += 0;
  }

  // 4. Prioridade administrativa
  score += (source.priority || 0) * 10;

  // 5. Penalidade por latência maior (máx 100 pontos de dedução)
  const latencyPenalty = Math.min(100, Math.floor(latencyMs / 20));
  score -= latencyPenalty;

  return score;
}

export const defaultStreamResolver = new StreamResolver();
