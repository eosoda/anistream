import type { JikanAnime, JikanCharacter, JikanEpisode, JikanGenre, JikanRelation, SeasonName } from '@/types/anime';
import type { LocalAnimeSearchResponse } from '@/types/local-search';
import { localSearchItemToAnime } from '@/types/local-search';

type AnimeId = string | number;

export interface SearchAnimeFilters {
  status?: 'airing' | 'complete' | 'upcoming' | 'all';
  minScore?: number;
  type?: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'all';
  orderBy?: 'score' | 'popularity' | 'title' | 'start_date';
  sort?: 'asc' | 'desc';
  letter?: string;
  genres?: string;
  audioLanguage?: 'all' | 'subbed_pt' | 'dubbed_pt' | 'pt_br';
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload?.error === 'object' && payload.error !== null
        ? payload.error.message
        : payload?.error;
    throw new Error(message || 'Não foi possível consultar o catálogo do Kenjitsu.');
  }
  return payload as T;
}

function encodeId(id: AnimeId): string {
  return encodeURIComponent(String(id));
}

export const kenjitsuService = {
  async searchAnime(
    query: string,
    page = 1,
    limit = 24,
    filters?: SearchAnimeFilters,
  ): Promise<{ data: JikanAnime[]; pagination: any }> {
    const params = new URLSearchParams({ q: query.trim(), page: String(page), limit: String(limit) });
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') params.set(key, String(value));
    });
    const result = await requestJson<LocalAnimeSearchResponse>(`/api/anime/search?${params.toString()}`);
    return {
      data: result.data.map(localSearchItemToAnime),
      pagination: {
        current_page: result.pagination.currentPage,
        has_next_page: result.pagination.hasNextPage,
        items: { total: result.pagination.totalItems, per_page: limit },
      },
    };
  },

  async getAnimeById(id: AnimeId): Promise<JikanAnime> {
    const payload = await requestJson<{ anime: JikanAnime }>(`/api/anime/${encodeId(id)}`);
    return payload.anime;
  },

  async getAnimeEpisodes(id: AnimeId, _page = 1): Promise<JikanEpisode[]> {
    const payload = await requestJson<{ episodes: JikanEpisode[] }>(`/api/anime/${encodeId(id)}/episodes`);
    return payload.episodes || [];
  },

  async getAnimeCharacters(id: AnimeId): Promise<JikanCharacter[]> {
    const payload = await requestJson<{ characters: JikanCharacter[] }>(`/api/anime/${encodeId(id)}/characters`);
    return payload.characters || [];
  },

  async getAnimeRelations(id: AnimeId): Promise<JikanRelation[]> {
    const payload = await requestJson<{ relations: JikanRelation[] }>(`/api/anime/${encodeId(id)}/relations`);
    return payload.relations || [];
  },

  async getTopAnime(type?: string, filter?: string, page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    const kind = filter === 'airing' || type === 'airing' ? 'airing' : filter === 'upcoming' ? 'upcoming' : 'popular';
    return requestJson(`/api/anime/catalog?kind=${kind}&page=${page}&limit=${limit}`);
  },

  async getSeasonNow(page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    return requestJson(`/api/anime/catalog?kind=airing&page=${page}&limit=${limit}`);
  },

  async getSeasonUpcoming(page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    return requestJson(`/api/anime/catalog?kind=upcoming&page=${page}&limit=${limit}`);
  },

  async getSeasonByYearAndSeason(
    year: number,
    season: SeasonName,
    page = 1,
    limit = 25,
  ): Promise<{ data: JikanAnime[]; pagination: any }> {
    return requestJson(`/api/anime/catalog?kind=season&year=${year}&season=${season}&page=${page}&limit=${limit}`);
  },

  async getGenres(): Promise<JikanGenre[]> {
    const genres = [
      ['1', 'Action'], ['2', 'Adventure'], ['4', 'Comedy'], ['8', 'Drama'], ['10', 'Fantasy'],
      ['22', 'Romance'], ['24', 'Sci-Fi'], ['36', 'Slice of Life'], ['37', 'Supernatural'],
      ['41', 'Thriller'], ['62', 'Isekai'],
    ];
    return genres.map(([mal_id, name]) => ({ mal_id: Number(mal_id), type: 'anime', name, url: '' }));
  },

  async getAnimeByGenre(genreId: number, page = 1, limit = 24): Promise<{ data: JikanAnime[]; pagination: any }> {
    const params = new URLSearchParams({ q: '', page: String(page), limit: String(limit), genres: String(genreId) });
    const result = await requestJson<LocalAnimeSearchResponse>(`/api/anime/search?${params.toString()}`);
    return {
      data: result.data.map(localSearchItemToAnime),
      pagination: {
        current_page: result.pagination.currentPage,
        has_next_page: result.pagination.hasNextPage,
        items: { total: result.pagination.totalItems, per_page: limit },
      },
    };
  },
};
