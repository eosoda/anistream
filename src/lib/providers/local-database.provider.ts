import { prisma } from '../db/prisma';
import { AnimeProvider } from './provider.interface';
import {
  AnimeSearchInput,
  AnimeSearchResult,
  Episode,
  EpisodeLookupInput,
  StreamSource,
  ProviderHealth,
  StreamType,
  AudioLanguage,
} from '../streams/types';
import { decryptData } from '../security/crypto';
import { normalizeAnimeTitle } from '../anime/normalize-title';

export class LocalDatabaseProvider implements AnimeProvider {
  public readonly id = 'local-database';
  public readonly name = 'Banco de Dados Local Autorizado';

  async searchAnime(
    input: AnimeSearchInput,
    signal?: AbortSignal
  ): Promise<AnimeSearchResult[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const normQuery = normalizeAnimeTitle(input.query);

    const animes = await prisma.anime.findMany({
      where: {
        OR: [
          { normalizedTitle: { contains: normQuery } },
          { title: { contains: input.query, mode: 'insensitive' } },
          {
            aliases: {
              some: { normalizedValue: { contains: normQuery } },
            },
          },
        ],
      },
      take: input.limit || 20,
    });

    return animes.map((a: any) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      originalTitle: a.originalTitle,
      posterUrl: a.posterUrl,
      releaseYear: a.releaseYear,
      status: a.status,
    }));
  }

  async listEpisodes(
    animeId: string,
    signal?: AbortSignal
  ): Promise<Episode[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const episodes = await prisma.episode.findMany({
      where: { animeId },
      orderBy: [{ season: 'asc' }, { number: 'asc' }],
    });

    return episodes.map((ep: any) => ({
      id: ep.id,
      animeId: ep.animeId,
      season: ep.season,
      number: ep.number,
      title: ep.title,
      description: ep.description,
      thumbnailUrl: ep.thumbnailUrl,
      durationSeconds: ep.durationSeconds,
      airedAt: ep.airedAt,
    }));
  }

  async getEpisodeSources(
    input: EpisodeLookupInput,
    signal?: AbortSignal
  ): Promise<StreamSource[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { id: input.animeId },
          { slug: input.animeId },
          {
            identifiers: {
              some: { value: input.animeId },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!anime) {
      return [];
    }

    const episode = await prisma.episode.findFirst({
      where: {
        animeId: anime.id,
        season: input.season,
        number: input.episode,
      },
      include: {
        sources: {
          where: { enabled: true },
          include: { subtitles: true },
        },
      },
    });

    if (!episode || !episode.sources) {
      return [];
    }

    const sources: StreamSource[] = [];

    for (const src of episode.sources) {
      // Verificar se expirou
      if (src.expiresAt && new Date(src.expiresAt) < new Date()) {
        continue;
      }

      const decryptedUrl = decryptData(src.urlEncrypted);
      let headers: Record<string, string> | undefined;

      if (src.headersEncrypted) {
        try {
          headers = JSON.parse(decryptData(src.headersEncrypted));
        } catch {
          headers = undefined;
        }
      }

      const subtitles = src.subtitles.map((sub: any) => ({
        language: sub.language,
        label: sub.label,
        url: decryptData(sub.urlEncrypted),
        format: sub.format as 'vtt' | 'srt' | 'ass',
      }));

      sources.push({
        id: src.id,
        provider: src.provider || this.id,
        url: decryptedUrl,
        type: src.type as StreamType,
        quality: src.quality || undefined,
        width: src.width || undefined,
        height: src.height || undefined,
        bitrate: src.bitrate || undefined,
        audioLanguage: (src.audioLanguage as AudioLanguage) || 'ja',
        subtitles,
        requiresProxy: src.requiresProxy,
        headers,
        expiresAt: src.expiresAt ? src.expiresAt.toISOString() : undefined,
        priority: src.priority,
      });
    }

    return sources;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;
      return {
        providerId: this.id,
        name: this.name,
        status: 'healthy',
        latencyMs,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'down',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        errorMessage: err.message,
      };
    }
  }
}
