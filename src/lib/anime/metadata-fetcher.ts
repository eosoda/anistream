import { getAnimeCatalog, searchAnimeCatalog } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';
import type { JikanAnime } from '@/types/anime';
import { normalizeAnimeTitle } from './normalize-title';

export interface StandardAnimeMetadata {
  malId?: number;
  anilistId?: number;
  title: string;
  originalTitle?: string;
  normalizedTitle: string;
  slug: string;
  posterUrl?: string;
  bannerUrl?: string;
  releaseYear?: number;
  status?: string;
  description?: string;
  episodesCount?: number;
  rating?: number;
  genres?: string;
  aliases?: string[];
}

/**
 * Compatibility facade for the admin import flow.
 * Every result is resolved from the self-hosted Kenjitsu catalog.
 */
export async function searchAnimeMetadata(query: string): Promise<StandardAnimeMetadata[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const idMatch = trimmed.match(/^(?:mal|anilist):\s*(\d+)$/i);
  if (idMatch) {
    try {
      const id = trimmed.toLowerCase().startsWith('anilist:') ? `anilist:${idMatch[1]}` : idMatch[1];
      return [mapAnime(await getAnimeCatalog(id))];
    } catch (error) {
      if (error instanceof KenjitsuRequestError && error.status === 404) return [];
      throw error;
    }
  }

  const search = await searchAnimeCatalog(trimmed, 1, 6);
  const detailed = await Promise.allSettled(
    search.data.map((item) => getAnimeCatalog(item.anilistId ?? item.malId)),
  );

  return detailed.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [mapAnime(result.value)];
    const searchItem = search.data[index];
    return searchItem ? [mapSearchItem(searchItem)] : [];
  });
}

function mapAnime(anime: JikanAnime): StandardAnimeMetadata {
  const title = anime.title || anime.title_english || anime.title_japanese || 'Anime sem titulo';
  const aliases = Array.from(
    new Set([title, anime.title_english, anime.title_japanese, ...(anime.title_synonyms || [])].filter(Boolean)),
  ) as string[];

  return {
    malId: anime.kenjitsu?.malId ?? undefined,
    anilistId: anime.kenjitsu?.anilistId ?? anime.mal_id,
    title,
    originalTitle: anime.title_japanese || undefined,
    normalizedTitle: normalizeAnimeTitle(title),
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${anime.mal_id}`,
    posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    bannerUrl: anime.bannerImage || anime.images?.jpg?.large_image_url,
    releaseYear: anime.year || undefined,
    status: anime.status || undefined,
    description: anime.synopsis || undefined,
    episodesCount: anime.episodes || undefined,
    rating: anime.score || undefined,
    genres: anime.genres?.map((genre) => genre.name).join(', '),
    aliases,
  };
}

function mapSearchItem(item: {
  malId: number;
  anilistId?: number | null;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
  status: string | null;
  episodeCount: number;
}): StandardAnimeMetadata {
  return {
    malId: item.anilistId ? undefined : item.malId,
    anilistId: item.anilistId ?? item.malId,
    title: item.title,
    originalTitle: item.originalTitle || undefined,
    normalizedTitle: normalizeAnimeTitle(item.title),
    slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${item.malId}`,
    posterUrl: item.posterUrl || undefined,
    bannerUrl: item.posterUrl || undefined,
    releaseYear: item.year || undefined,
    status: item.status || undefined,
    episodesCount: item.episodeCount || undefined,
    rating: item.rating || undefined,
    aliases: [item.title, item.originalTitle || ''].filter(Boolean),
  };
}
