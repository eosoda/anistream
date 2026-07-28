import { AnimeProvider } from './provider.interface';
import {
  AnimeSearchInput,
  AnimeSearchResult,
  Episode,
  EpisodeLookupInput,
  StreamSource,
  ProviderHealth,
} from '../streams/types';
import { env } from '@/env';

export class OfficialMetadataProvider implements AnimeProvider {
  public readonly id = 'official-metadata';
  public readonly name = 'API Oficial de Metadados Autorizados';

  async searchAnime(
    input: AnimeSearchInput,
    signal?: AbortSignal
  ): Promise<AnimeSearchResult[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    try {
      const url = `${env.AUTHORIZED_METADATA_API_URL}/anime?q=${encodeURIComponent(
        input.query
      )}&limit=${input.limit || 20}`;

      const res = await fetch(url, { signal });
      if (!res.ok) return [];

      const json = await res.json();
      const data = json.data || [];

      return data.map((item: any) => ({
        id: `official-${item.mal_id || item.id}`,
        slug: item.title?.toLowerCase().replace(/\s+/g, '-') || '',
        title: item.title || item.title_japanese,
        originalTitle: item.title_japanese,
        posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
        releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
        status: item.status,
      }));
    } catch {
      return [];
    }
  }

  async listEpisodes(
    animeId: string,
    signal?: AbortSignal
  ): Promise<Episode[]> {
    if (signal?.aborted) throw new Error('Operação abortada pelo cliente');

    const cleanId = animeId.replace('official-', '');
    try {
      const url = `${env.AUTHORIZED_METADATA_API_URL}/anime/${cleanId}/episodes`;
      const res = await fetch(url, { signal });
      if (!res.ok) return [];

      const json = await res.json();
      const data = json.data || [];

      return data.map((ep: any) => ({
        id: `ep-${cleanId}-${ep.mal_id}`,
        animeId,
        season: 1,
        number: ep.mal_id,
        title: ep.title,
        airedAt: ep.aired,
      }));
    } catch {
      return [];
    }
  }

  // IMPORTANTE: Provedores de metadados oficiais NÃO fornecem URLs de vídeo de streaming
  async getEpisodeSources(
    _input: EpisodeLookupInput,
    _signal?: AbortSignal
  ): Promise<StreamSource[]> {
    return [];
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const res = await fetch(`${env.AUTHORIZED_METADATA_API_URL}/anime/1`);
      return {
        providerId: this.id,
        name: this.name,
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs: Date.now() - startTime,
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
