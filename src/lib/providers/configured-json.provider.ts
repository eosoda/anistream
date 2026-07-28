import { AnimeProvider } from './provider.interface';
import {
  AnimeSearchInput,
  AnimeSearchResult,
  Episode,
  EpisodeLookupInput,
  StreamSource,
  ProviderHealth,
  AudioLanguage,
  StreamType,
} from '../streams/types';
import { isTitleMatching } from '../anime/similarity';
import { ConfiguredJsonSourceSchema } from '@/schemas/provider';
import { z } from 'zod';

export type ConfiguredSourceItem = z.infer<typeof ConfiguredJsonSourceSchema>;

export class ConfiguredJsonProvider implements AnimeProvider {
  public readonly id = 'configured-json';
  public readonly name = 'Fontes JSON Configuradas Autorizadas';

  private sources: ConfiguredSourceItem[];

  constructor(initialSources: ConfiguredSourceItem[] = []) {
    this.sources = initialSources;
  }

  public setSources(newSources: ConfiguredSourceItem[]): void {
    this.sources = newSources;
  }

  async searchAnime(
    input: AnimeSearchInput,
    signal?: AbortSignal
  ): Promise<AnimeSearchResult[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const results: AnimeSearchResult[] = [];
    const seenTitles = new Set<string>();

    for (const item of this.sources) {
      if (
        isTitleMatching(item.anime.title, input.query, item.anime.aliases)
      ) {
        const titleKey = item.anime.title.toLowerCase();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          results.push({
            id: `json-${titleKey.replace(/\s+/g, '-')}`,
            slug: titleKey.replace(/\s+/g, '-'),
            title: item.anime.title,
          });
        }
      }
    }

    return results;
  }

  async getEpisodeSources(
    input: EpisodeLookupInput,
    signal?: AbortSignal
  ): Promise<StreamSource[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const matchingSources: StreamSource[] = [];

    for (let index = 0; index < this.sources.length; index++) {
      const item = this.sources[index];

      const matchesAnime =
        input.animeId.startsWith('json-') ||
        isTitleMatching(item.anime.title, input.animeId, item.anime.aliases);

      if (
        matchesAnime &&
        item.season === input.season &&
        item.episode === input.episode
      ) {
        matchingSources.push({
          id: `json-src-${index}`,
          provider: this.id,
          url: item.url,
          type: item.type as StreamType,
          quality: item.quality,
          audioLanguage: (item.audioLanguage as AudioLanguage) || 'ja',
          subtitles: item.subtitles?.map((s) => ({
            language: s.language,
            label: s.label,
            url: s.url,
            format: s.format as 'vtt' | 'srt' | 'ass',
          })),
          requiresProxy: item.requiresProxy,
          headers: item.headers,
          priority: item.priority,
        });
      }
    }

    return matchingSources;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      name: this.name,
      status: 'healthy',
      latencyMs: 1,
      lastChecked: new Date().toISOString(),
    };
  }
}
