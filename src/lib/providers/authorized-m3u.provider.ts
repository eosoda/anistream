import { AnimeProvider } from './provider.interface';
import {
  AnimeSearchInput,
  AnimeSearchResult,
  EpisodeLookupInput,
  StreamSource,
  ProviderHealth,
} from '../streams/types';
import { parseM3uContent, ParsedM3uItem } from '../streams/m3u-parser';
import { isTitleMatching } from '../anime/similarity';

export class AuthorizedM3uProvider implements AnimeProvider {
  public readonly id = 'authorized-m3u';
  public readonly name = 'Provedor de Catálogo M3U Autorizado';

  private parsedItems: ParsedM3uItem[] = [];

  constructor(m3uContent?: string) {
    if (m3uContent) {
      this.loadM3uContent(m3uContent);
    }
  }

  public loadM3uContent(content: string): void {
    this.parsedItems = parseM3uContent(content);
  }

  async searchAnime(
    input: AnimeSearchInput,
    signal?: AbortSignal
  ): Promise<AnimeSearchResult[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const results: AnimeSearchResult[] = [];
    const seenTitles = new Set<string>();

    for (const item of this.parsedItems) {
      if (isTitleMatching(item.rawTitle, input.query)) {
        const titleKey = item.normalizedTitle;
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          results.push({
            id: `m3u-${titleKey.replace(/\s+/g, '-')}`,
            slug: titleKey.replace(/\s+/g, '-'),
            title: item.rawTitle,
            posterUrl: item.logoUrl,
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

    const sources: StreamSource[] = [];

    const allAliases = [
      input.animeTitle || '',
      input.originalTitle || '',
      ...(input.aliases || []),
    ].filter(Boolean);

    for (let i = 0; i < this.parsedItems.length; i++) {
      const item = this.parsedItems[i];

      const matchesAnime =
        input.animeId.startsWith('m3u-') ||
        isTitleMatching(item.rawTitle, input.animeTitle || input.animeId, [], allAliases);

      if (
        matchesAnime &&
        item.detectedSeason === input.season &&
        item.detectedEpisode === input.episode
      ) {
        sources.push({
          id: `m3u-src-${i}`,
          provider: this.id,
          url: item.streamUrl,
          type: item.streamUrl.endsWith('.mp4') ? 'mp4' : 'hls',
          quality: '1080p',
          audioLanguage: input.preferredAudio || 'ja',
          requiresProxy: false,
          priority: 50,
        });
      }
    }

    return sources;
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
