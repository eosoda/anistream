import type { AnimeProvider } from './provider.interface';
import type {
  AudioLanguage,
  Episode,
  EpisodeLookupInput,
  ProviderHealth,
  StreamSource,
  StreamType,
} from '../streams/types';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import { resolveAnilistId } from '@/lib/kenjitsu/catalog';
import { getEnabledKenjitsuExtensions } from '@/lib/kenjitsu/settings';
import type { KenjitsuExtensionId, KenjitsuProviderEpisode } from '@/lib/kenjitsu/types';

const EXTENSION_LABELS: Record<KenjitsuExtensionId, string> = {
  anizone: 'AniZone',
  anikoto: 'AniKoto',
  anidb: 'AniDB',
  anibd: 'AniBD',
  animeheaven: 'AnimeHeaven',
};

function sourceType(url: string, isM3u8?: boolean | null, type?: string | null): StreamType {
  if (isM3u8 || type?.toLowerCase() === 'hls' || url.toLowerCase().includes('.m3u8')) return 'hls';
  if (type?.toLowerCase() === 'mp4' || url.toLowerCase().includes('.mp4')) return 'mp4';
  return 'embed';
}

function sourceId(extensionId: KenjitsuExtensionId, url: string): string {
  return `kenjitsu:${extensionId}:${Buffer.from(url).toString('base64url')}`;
}

function versionForAudio(audio?: AudioLanguage): 'sub' | 'dub' {
  return audio === 'pt-BR' ? 'dub' : 'sub';
}

function selectEpisode(episodes: KenjitsuProviderEpisode[], number: number, version: 'sub' | 'dub') {
  const matches = episodes.filter((episode) => Number(episode.episodeNumber) === number && episode.episodeId);
  return (
    matches.find((episode) => (version === 'dub' ? episode.hasDub !== false : episode.hasSub !== false)) ||
    matches[0] ||
    null
  );
}

export class KenjitsuProvider implements AnimeProvider {
  readonly id = 'kenjitsu';
  readonly name = 'Kenjitsu — extensões nativas';

  async listEpisodes(animeId: string, signal?: AbortSignal): Promise<Episode[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');
    const anilistId = await resolveAnilistId(animeId);
    const extensionIds = await getEnabledKenjitsuExtensions();
    const results = await Promise.allSettled(
      extensionIds.map(async (extensionId) => {
        const mapping = await kenjitsuClient.getMapping(anilistId, extensionId);
        if (!mapping.provider?.id) return [] as Episode[];
        const info = await kenjitsuClient.getExtensionInfo(extensionId, mapping.provider.id);
        const providerEpisodes = info.providerEpisodes || info.data?.providerEpisodes || [];
        return providerEpisodes.flatMap((episode) =>
          episode.episodeId && episode.episodeNumber != null
            ? [{ id: `${extensionId}:${episode.episodeId}`, animeId, season: 1, number: Number(episode.episodeNumber), title: episode.title, description: episode.overview, thumbnailUrl: episode.thumbnail }]
            : [],
        );
      }),
    );
    const episodes = new Map<number, Episode>();
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      result.value.forEach((episode) => episodes.set(episode.number, episodes.get(episode.number) || episode));
    });
    return Array.from(episodes.values()).sort((a, b) => a.number - b.number);
  }

  async getEpisodeSources(input: EpisodeLookupInput, signal?: AbortSignal): Promise<StreamSource[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');
    const anilistId = await resolveAnilistId(input.animeId);
    const extensionIds = await getEnabledKenjitsuExtensions();
    const version = versionForAudio(input.preferredAudio);

    const results = await Promise.allSettled(
      extensionIds.map(async (extensionId, index) => {
        if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

        const mapping = await kenjitsuClient.getMapping(anilistId, extensionId);
        if (!mapping.provider?.id) return [] as StreamSource[];

        const info = await kenjitsuClient.getExtensionInfo(extensionId, mapping.provider.id);
        const providerEpisodes = info.providerEpisodes || info.data?.providerEpisodes || [];
        const episode = selectEpisode(providerEpisodes, input.episode, version);
        if (!episode?.episodeId) return [] as StreamSource[];

        const sourceResponse = await kenjitsuClient.getExtensionSources(extensionId, episode.episodeId, version);
        const referer = sourceResponse.headers?.Referer || undefined;
        return (sourceResponse.data?.sources || []).flatMap((source) => {
          if (!source.url) return [];
          const type = sourceType(source.url, source.isM3u8, source.type);
          return [{
            id: sourceId(extensionId, source.url),
            provider: EXTENSION_LABELS[extensionId],
            url: source.url,
            type,
            quality: source.quality || 'Auto',
            audioLanguage: version === 'dub' ? 'pt-BR' : 'ja',
            subtitles: (sourceResponse.data?.subtitles || []).flatMap((subtitle) =>
              subtitle.url
                ? [{ language: subtitle.lang || subtitle.label || 'und', label: subtitle.label || subtitle.lang || 'Legenda', url: subtitle.url, format: 'vtt' as const }]
                : [],
            ),
            requiresProxy: type !== 'embed',
            headers: referer ? { Referer: referer } : undefined,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            priority: Math.max(1, extensionIds.length - index),
          } satisfies StreamSource];
        });
      }),
    );

    return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = Date.now();
    try {
      const response = await kenjitsuClient.getExtensionHealth();
      const active = response.data?.length || 0;
      return {
        providerId: this.id,
        name: this.name,
        status: active === 5 ? 'healthy' : active > 0 ? 'degraded' : 'down',
        latencyMs: Date.now() - startedAt,
        lastChecked: new Date().toISOString(),
        errorMessage: active === 0 ? 'Nenhuma extensão retornada pelo Kenjitsu.' : undefined,
      };
    } catch (error) {
      return {
        providerId: this.id,
        name: this.name,
        status: 'down',
        latencyMs: Date.now() - startedAt,
        lastChecked: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Falha ao consultar o Kenjitsu.',
      };
    }
  }
}
