import type { AniListMedia, JikanAnime } from '@/types/anime';
import { kenjitsuService } from './kenjitsu';

function mapAnime(anime: JikanAnime): AniListMedia {
  const title = {
    romaji: anime.title || anime.title_japanese || 'Anime',
    english: anime.title_english || anime.title || 'Anime',
    native: anime.title_japanese || anime.title || 'Anime',
  };
  const cover = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  return {
    id: anime.kenjitsu?.anilistId || anime.mal_id,
    idMal: anime.kenjitsu?.malId || anime.mal_id,
    title,
    bannerImage: anime.bannerImage || cover || null,
    coverImage: { extraLarge: cover, large: cover, medium: cover, color: null },
    description: anime.synopsis || null,
    episodes: anime.episodes,
    status: anime.status || 'UNKNOWN',
    meanScore: anime.score != null ? anime.score * 10 : null,
    popularity: null,
    trending: null,
    genres: anime.genres?.map((genre) => genre.name) || [],
  };
}

/**
 * Backward-compatible name for callers that still expect the old AniList
 * service. Requests go through the AniStream/Kenjitsu facade only.
 */
export const anilistService = {
  async getMediaByMalId(malId: number): Promise<AniListMedia | null> {
    try {
      return mapAnime(await kenjitsuService.getAnimeById(malId));
    } catch {
      return null;
    }
  },

  async getTrendingBanners(perPage = 10): Promise<AniListMedia[]> {
    try {
      const response = await kenjitsuService.getTopAnime('trending', undefined, 1, perPage);
      return response.data.map(mapAnime);
    } catch {
      return [];
    }
  },
};
