'use client';

import type { JikanAnime } from '@/types/anime';
import type { HomepageLayoutDocument, HomepageResolvedBlock } from '@/types/homepage';
import { HomepageRenderer } from '@/components/home/HomepageRenderer';

const PREVIEW_IMAGE = '/hero-frieren-fast.webp';

function previewAnime(id: number, title: string, score: number, genres: string[]): JikanAnime {
  return {
    mal_id: id,
    url: `/anime/${id}`,
    images: {
      jpg: { image_url: PREVIEW_IMAGE, small_image_url: PREVIEW_IMAGE, large_image_url: PREVIEW_IMAGE },
      webp: { image_url: PREVIEW_IMAGE, small_image_url: PREVIEW_IMAGE, large_image_url: PREVIEW_IMAGE },
    },
    trailer: { youtube_id: null, url: null, embed_url: null, images: { image_url: null, small_image_url: null, medium_image_url: null, large_image_url: null, maximum_image_url: null } },
    approved: true,
    titles: [{ type: 'English', title }],
    title,
    title_english: title,
    title_japanese: null,
    title_synonyms: [],
    type: 'TV',
    source: 'Original',
    episodes: 24,
    status: 'Currently Airing',
    airing: true,
    aired: { from: null, to: null, string: 'Temporada atual' },
    duration: '24 min per ep',
    rating: 'PG-13',
    score,
    scored_by: null,
    rank: null,
    popularity: null,
    members: null,
    favorites: null,
    synopsis: 'Prévia visual com dados de exemplo. A Home publicada resolverá os dados reais no Kenjitsu.',
    background: null,
    season: 'summer',
    year: 2026,
    broadcast: { day: 'Sábado', time: '18:00', timezone: 'JST', string: 'Sábado às 18:00' },
    producers: [],
    licensors: [],
    studios: [],
    genres: genres.map((name, index) => ({ mal_id: index + 1, type: 'anime', name, url: '' })),
    explicit_genres: [],
    themes: [],
    demographics: [],
    bannerImage: PREVIEW_IMAGE,
    kenjitsu: { anilistId: id, malId: null },
  };
}

const PREVIEW_ANIMES = [
  previewAnime(52991, 'Sousou no Frieren', 9.4, ['Fantasia', 'Aventura']),
  previewAnime(16498, 'Shingeki no Kyojin', 9.1, ['Ação', 'Drama']),
  previewAnime(21, 'One Piece', 8.9, ['Aventura', 'Ação']),
  previewAnime(101922, 'Kimetsu no Yaiba', 8.7, ['Ação', 'Fantasia']),
  previewAnime(1535, 'Death Note', 8.6, ['Suspense', 'Drama']),
];

export function HomepageDraftPreview({ document }: { document: HomepageLayoutDocument }) {
  const blocks: HomepageResolvedBlock[] = document.blocks
    .filter((block) => block.enabled)
    .map((block) => {
      if (block.type === 'hero' || block.type === 'catalog_carousel') {
        return { id: block.id, type: block.type, status: 'ready' as const, data: PREVIEW_ANIMES.slice(0, block.type === 'hero' ? block.slideLimit : block.limit) };
      }
      if (block.type === 'continue_watching') return { id: block.id, type: block.type, status: 'client' as const };
      return { id: block.id, type: block.type, status: 'ready' as const };
    });

  return <HomepageRenderer document={document} blocks={blocks} preview />;
}

