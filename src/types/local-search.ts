import type { JikanAnime } from '@/types/anime';

export interface LocalAnimeSearchItem {
  malId: number;
  anilistId?: number | null;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
  status: string | null;
  episodeCount: number;
}

export interface LocalAnimeSearchPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface LocalAnimeSearchResponse {
  data: LocalAnimeSearchItem[];
  pagination: LocalAnimeSearchPagination;
}

export function localSearchItemToAnime(item: LocalAnimeSearchItem): JikanAnime {
  const poster = item.posterUrl || '';
  return {
    mal_id: item.malId,
    url: `/anime/${item.malId}`,
    images: {
      jpg: { image_url: poster, small_image_url: poster, large_image_url: poster },
      webp: { image_url: poster, small_image_url: poster, large_image_url: poster },
    },
    trailer: { youtube_id: null, url: null, embed_url: null, images: { image_url: null, small_image_url: null, medium_image_url: null, large_image_url: null, maximum_image_url: null } },
    approved: true,
    titles: [{ type: 'Default', title: item.title }],
    title: item.title,
    title_english: item.title,
    title_japanese: item.originalTitle,
    title_synonyms: [],
    type: null,
    source: null,
    episodes: item.episodeCount,
    status: item.status,
    airing: false,
    aired: { from: null, to: null, string: item.year ? String(item.year) : '' },
    duration: null,
    rating: null,
    score: item.rating,
    scored_by: null,
    rank: null,
    popularity: null,
    members: null,
    favorites: null,
    synopsis: null,
    background: null,
    season: null,
    year: item.year,
    producers: [],
    licensors: [],
    studios: [],
    genres: [],
    explicit_genres: [],
    themes: [],
    demographics: [],
    kenjitsu: { anilistId: item.anilistId ?? item.malId },
  };
}
