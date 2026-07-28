import {
  AnimeSearchInput,
  AnimeSearchResult,
  Episode,
  EpisodeLookupInput,
  StreamSource,
  ProviderHealth,
} from '../streams/types';

export interface AnimeProvider {
  readonly id: string;
  readonly name: string;

  searchAnime?(
    input: AnimeSearchInput,
    signal?: AbortSignal
  ): Promise<AnimeSearchResult[]>;

  listEpisodes?(
    animeId: string,
    signal?: AbortSignal
  ): Promise<Episode[]>;

  getEpisodeSources(
    input: EpisodeLookupInput,
    signal?: AbortSignal
  ): Promise<StreamSource[]>;

  healthCheck?(): Promise<ProviderHealth>;
}
