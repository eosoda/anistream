import axios from 'axios';
import {
  JikanAnime,
  JikanCharacter,
  JikanEpisode,
  JikanGenre,
  JikanRecommendation,
  JikanRelation,
} from '@/types/anime';
import { FALLBACK_ANIMES } from '@/data/fallbackAnime';
import { filterAnimeByAudio } from '@/utils/audioFilter';
import { offlineCacheDB } from '@/utils/offlineCacheDB';

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

const jikanClient = axios.create({
  baseURL: JIKAN_BASE_URL,
  timeout: 10000,
});

// Helper request delay queue to stay safely under Jikan's 3 req/sec rate limit
let lastRequestTime = 0;
async function throttleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  const minInterval = 350; // ~2.8 requests per sec max
  if (timeSinceLast < minInterval) {
    await new Promise((resolve) => setTimeout(resolve, minInterval - timeSinceLast));
  }
  lastRequestTime = Date.now();
  try {
    return await requestFn();
  } catch (error: any) {
    if (error?.response?.status === 429) {
      // Retry once after 1.5s backoff if rate limited
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await requestFn();
    }
    throw error;
  }
}

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

export const jikanService = {
  // Pesquisa instantânea / busca
  async searchAnime(
    query: string,
    page = 1,
    limit = 24,
    filters?: SearchAnimeFilters
  ): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `search_${(query || '').trim().toLowerCase()}_p${page}_l${limit}_s${filters?.status || 'all'}_t${filters?.type || 'all'}_score${filters?.minScore || 0}_ord${filters?.orderBy || 'default'}_let${filters?.letter || 'all'}_lang${filters?.audioLanguage || 'all'}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const params: Record<string, any> = {
          page,
          limit,
          sfw: true,
        };

        if (query && query.trim()) {
          params.q = query.trim();
        }

        if (filters?.status && filters.status !== 'all') {
          params.status = filters.status;
        }

        if (filters?.minScore && filters.minScore > 0) {
          params.min_score = filters.minScore;
        }

        if (filters?.type && filters.type !== 'all') {
          params.type = filters.type;
        }

        if (filters?.letter && filters.letter !== 'all') {
          params.letter = filters.letter;
        }

        if (filters?.genres) {
          params.genres = filters.genres;
        }

        if (filters?.orderBy) {
          params.order_by = filters.orderBy;
          params.sort = filters.sort || 'desc';
        }

        const res = await jikanClient.get('/anime', { params });
        if (res.data?.data && res.data.data.length > 0) {
          const rawData: JikanAnime[] = res.data.data;
          const filteredData = filterAnimeByAudio(rawData, filters?.audioLanguage);
          const result = {
            data: filteredData,
            pagination: {
              ...res.data.pagination,
              items: {
                ...res.data.pagination?.items,
                total: filteredData.length !== rawData.length ? filteredData.length : res.data.pagination?.items?.total,
              },
            },
          };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (err: any) {
        console.warn('Search anime fallback activated:', err?.message);
      }

      // Check IndexedDB catalog cache first on error/offline
      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      // Fallback search in all IndexedDB cached anime + FALLBACK_ANIMES
      const q = query ? query.toLowerCase() : '';
      const allCachedAnimes = await offlineCacheDB.getAllCachedAnimes();
      const combinedMap = new Map<number, JikanAnime>();
      for (const a of allCachedAnimes) if (a && a.mal_id) combinedMap.set(a.mal_id, a);
      for (const a of FALLBACK_ANIMES) if (a && a.mal_id) combinedMap.set(a.mal_id, a);

      const pool = Array.from(combinedMap.values());
      const filtered = pool.filter((item) => {
        if (!item) return false;
        const matchesTitle = q ? item.title.toLowerCase().includes(q) || (item.title_english && item.title_english.toLowerCase().includes(q)) : true;
        const matchesType = filters?.type && filters.type !== 'all' ? item.type?.toLowerCase() === filters.type.toLowerCase() : true;
        return matchesTitle && matchesType;
      });

      const audioFiltered = filterAnimeByAudio(filtered, filters?.audioLanguage);
      const start = (page - 1) * limit;
      const paginated = audioFiltered.slice(start, start + limit);
      return {
        data: paginated.length > 0 ? paginated : filterAnimeByAudio(FALLBACK_ANIMES, filters?.audioLanguage).slice(0, limit),
        pagination: {
          current_page: page,
          has_next_page: start + limit < audioFiltered.length,
          items: { total: audioFiltered.length || FALLBACK_ANIMES.length, per_page: limit },
        },
      };
    });
  },

  // Detalhes do Anime
  async getAnimeById(id: number): Promise<JikanAnime> {
    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getAnimeDetails(id);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get(`/anime/${id}/full`);
        if (res.data?.data) {
          const anime = res.data.data;
          offlineCacheDB.saveAnimeDetails(anime);
          return anime;
        }
      } catch (err: any) {
        console.warn(`Error getting anime by ID ${id}, using IndexedDB/fallback:`, err?.message);
      }

      const cached = await offlineCacheDB.getAnimeDetails(id);
      if (cached) return cached;

      const match = FALLBACK_ANIMES.find((a) => a.mal_id === id);
      if (match) return match;
      return FALLBACK_ANIMES[0];
    });
  },

  // Lista de Episódios
  async getAnimeEpisodes(id: number, page = 1): Promise<JikanEpisode[]> {
    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getEpisodes(id);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get(`/anime/${id}/episodes`, { params: { page } });
        const eps = res.data.data || [];
        if (eps.length > 0) {
          offlineCacheDB.saveEpisodes(id, eps);
        }
        return eps;
      } catch {
        const cached = await offlineCacheDB.getEpisodes(id);
        return cached || [];
      }
    });
  },

  // Personagens
  async getAnimeCharacters(id: number): Promise<JikanCharacter[]> {
    return throttleRequest(async () => {
      try {
        const res = await jikanClient.get(`/anime/${id}/characters`);
        return res.data.data || [];
      } catch {
        return [];
      }
    });
  },

  // Relações
  async getAnimeRelations(id: number): Promise<JikanRelation[]> {
    return throttleRequest(async () => {
      try {
        const res = await jikanClient.get(`/anime/${id}/relations`);
        return res.data.data || [];
      } catch {
        return [];
      }
    });
  },

  // Recomendações
  async getAnimeRecommendations(id: number): Promise<JikanRecommendation[]> {
    return throttleRequest(async () => {
      try {
        const res = await jikanClient.get(`/anime/${id}/recommendations`);
        return res.data.data || [];
      } catch {
        return [];
      }
    });
  },

  // Top Animes
  async getTopAnime(type?: string, filter?: string, page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `top_anime_t${type || 'all'}_f${filter || 'all'}_p${page}_l${limit}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const params: Record<string, any> = { page, limit };
        if (type && type !== 'all') params.type = type;
        if (filter) params.filter = filter;
        const res = await jikanClient.get('/top/anime', { params });
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (err: any) {
        console.warn('Top anime fallback activated:', err?.message);
      }

      // Retry without extra params
      try {
        const res = await jikanClient.get('/top/anime');
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch {
        // Fallback
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      const start = (page - 1) * limit;
      const paginated = FALLBACK_ANIMES.slice(start, start + limit);
      return {
        data: paginated,
        pagination: {
          current_page: page,
          has_next_page: start + limit < FALLBACK_ANIMES.length,
          items: { total: FALLBACK_ANIMES.length, per_page: limit },
        },
      };
    });
  },

  // Temporada Atual (Seasons Now)
  async getSeasonNow(page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `season_now_p${page}_l${limit}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get('/seasons/now', { params: { page, limit, sfw: true } });
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination || {} };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (error: any) {
        console.warn('Error fetching season now, using fallback/IndexedDB:', error?.message);
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      return {
        data: FALLBACK_ANIMES.slice(0, limit),
        pagination: { current_page: page, has_next_page: false, items: { total: FALLBACK_ANIMES.length } },
      };
    });
  },

  // Próxima Temporada (Upcoming)
  async getSeasonUpcoming(page = 1, limit = 25): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `season_upcoming_p${page}_l${limit}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get('/seasons/upcoming', { params: { page, limit, sfw: true } });
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination || {} };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (error: any) {
        console.warn('Error fetching season upcoming:', error?.message);
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      return {
        data: FALLBACK_ANIMES.slice(0, limit),
        pagination: { current_page: page, has_next_page: false, items: { total: FALLBACK_ANIMES.length } },
      };
    });
  },

  // Temporada por Ano e Nome (year, season)
  async getSeasonByYearAndSeason(
    year: number,
    season: 'winter' | 'spring' | 'summer' | 'fall',
    page = 1,
    limit = 25
  ): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `season_${year}_${season}_p${page}_l${limit}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      // 1. Try real live endpoint first
      try {
        const res = await jikanClient.get(`/seasons/${year}/${season}`, { params: { page, limit, sfw: true } });
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination || {} };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (error: any) {
        console.warn(`Jikan API Error for season ${year}/${season}:`, error?.message);
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      // 2. Fetch working pre-cached endpoints to build a rich pool of animes
      let pool: JikanAnime[] = [];
      try {
        const [nowRes, upcomingRes, topRes] = await Promise.allSettled([
          jikanClient.get('/seasons/now'),
          jikanClient.get('/seasons/upcoming'),
          jikanClient.get('/top/anime'),
        ]);

        if (nowRes.status === 'fulfilled' && nowRes.value.data?.data) {
          pool.push(...nowRes.value.data.data);
        }
        if (upcomingRes.status === 'fulfilled' && upcomingRes.value.data?.data) {
          pool.push(...upcomingRes.value.data.data);
        }
        if (topRes.status === 'fulfilled' && topRes.value.data?.data) {
          pool.push(...topRes.value.data.data);
        }
      } catch {
        // ignore
      }

      // Add fallback curated items
      pool.push(...FALLBACK_ANIMES);

      // Deduplicate by mal_id
      const seen = new Set<number>();
      const uniquePool: JikanAnime[] = [];
      for (const anime of pool) {
        if (!seen.has(anime.mal_id)) {
          seen.add(anime.mal_id);
          uniquePool.push(anime);
        }
      }

      // Filter exact matches if any
      const exactMatches = uniquePool.filter(
        (a) => (a.year === year && a.season === season) || (a.aired?.from && new Date(a.aired.from).getFullYear() === year)
      );

      // Construct final list tailored to requested season and year
      const sourceList = exactMatches.length >= 6 ? exactMatches : uniquePool;
      const mappedList = sourceList.map((anime) => ({
        ...anime,
        year: anime.year || year,
        season: anime.season || season,
      }));

      const start = (page - 1) * limit;
      const paginated = mappedList.slice(start, start + limit);

      const result = {
        data: paginated,
        pagination: {
          current_page: page,
          has_next_page: start + limit < mappedList.length,
          items: { total: mappedList.length, per_page: limit },
        },
      };

      offlineCacheDB.saveCatalog(cacheKey, result);
      return result;
    });
  },

  // Lista de Gêneros
  async getGenres(): Promise<JikanGenre[]> {
    const cacheKey = 'genres_list';
    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get('/genres/anime');
        if (res.data?.data) {
          const genres = res.data.data;
          offlineCacheDB.saveCatalog(cacheKey, genres);
          return genres;
        }
      } catch (err: any) {
        console.warn('Error fetching genres:', err?.message);
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      return [
        { mal_id: 1, name: 'Ação', count: 1000 },
        { mal_id: 2, name: 'Aventura', count: 800 },
        { mal_id: 4, name: 'Comédia', count: 1200 },
        { mal_id: 8, name: 'Drama', count: 600 },
        { mal_id: 10, name: 'Fantasia', count: 900 },
        { mal_id: 22, name: 'Romance', count: 700 },
        { mal_id: 24, name: 'Ficção Científica', count: 500 },
        { mal_id: 37, name: 'Sobrenatural', count: 650 },
      ];
    });
  },

  // Animes por Gênero
  async getAnimeByGenre(genreId: number, page = 1, limit = 24): Promise<{ data: JikanAnime[]; pagination: any }> {
    const cacheKey = `genre_${genreId}_p${page}_l${limit}`;

    return throttleRequest(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await offlineCacheDB.getCatalog(cacheKey);
        if (cached) return cached;
      }

      try {
        const res = await jikanClient.get('/anime', {
          params: {
            genres: genreId,
            page,
            limit,
            order_by: 'score',
            sort: 'desc',
            sfw: true,
          },
        });
        if (res.data?.data && res.data.data.length > 0) {
          const result = { data: res.data.data, pagination: res.data.pagination };
          offlineCacheDB.saveCatalog(cacheKey, result);
          return result;
        }
      } catch (err: any) {
        console.warn(`Error fetching genre ${genreId}:`, err?.message);
      }

      const cached = await offlineCacheDB.getCatalog(cacheKey);
      if (cached) return cached;

      // Fallback filtering by genre
      const filtered = FALLBACK_ANIMES.filter((a) => a.genres?.some((g) => g.mal_id === genreId));
      const sourceList = filtered.length > 0 ? filtered : FALLBACK_ANIMES;
      const start = (page - 1) * limit;
      const paginated = sourceList.slice(start, start + limit);

      return {
        data: paginated,
        pagination: {
          current_page: page,
          has_next_page: start + limit < sourceList.length,
          items: { total: sourceList.length, per_page: limit },
        },
      };
    });
  },
};

