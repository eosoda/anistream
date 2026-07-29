import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    // 1. Buscar animes populares da API do Jikan (Top 25 da primeira página)
    const res = await fetch('https://api.jikan.moe/v4/top/anime?limit=25', {
      headers: { 'User-Agent': 'AniStream-SetupSeed/1.0' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Falha na API Jikan (HTTP ${res.status})`);
    }

    const data = await res.json();
    const topAnimes = data?.data || [];

    let seededCount = 0;

    for (const animeData of topAnimes) {
      const title = animeData.title_english || animeData.title || 'Anime Sem Título';
      const rawSlug = (animeData.title_english || animeData.title || `anime-${animeData.mal_id}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = rawSlug || `anime-${animeData.mal_id}`;

      const posterUrl =
        animeData.images?.jpg?.large_image_url ||
        animeData.images?.jpg?.image_url ||
        'https://picsum.photos/300/450';

      const genres = Array.isArray(animeData.genres)
        ? animeData.genres.map((g: any) => g.name).join(', ')
        : 'Ação, Aventura';

      // 2. Salvar ou atualizar Anime no PostgreSQL
      const anime = await prisma.anime.upsert({
        where: { slug },
        update: {
          title,
          normalizedTitle: title.toLowerCase(),
          synopsis: animeData.synopsis || 'Sem sinopse disponível.',
          posterUrl,
          backdropUrl: posterUrl,
          rating: animeData.score || 8.0,
          year: animeData.year || new Date().getFullYear(),
          status: animeData.status === 'Currently Airing' ? 'AIRING' : 'FINISHED',
          genres,
        },
        create: {
          title,
          normalizedTitle: title.toLowerCase(),
          slug,
          synopsis: animeData.synopsis || 'Sem sinopse disponível.',
          posterUrl,
          backdropUrl: posterUrl,
          rating: animeData.score || 8.0,
          year: animeData.year || new Date().getFullYear(),
          status: animeData.status === 'Currently Airing' ? 'AIRING' : 'FINISHED',
          genres,
        },
      });

      // 3. Gerar 3 episódios iniciais padrão para cada anime
      const episodesCount = Math.min(animeData.episodes || 12, 3);
      for (let epNum = 1; epNum <= episodesCount; epNum++) {
        await prisma.episode.upsert({
          where: {
            animeId_season_number: {
              animeId: anime.id,
              season: 1,
              number: epNum,
            },
          },
          update: {},
          create: {
            animeId: anime.id,
            season: 1,
            number: epNum,
            title: `Episódio ${epNum}`,
            overview: `Episódio ${epNum} de ${title}`,
          },
        });
      }

      seededCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Catálogo inicial populado com sucesso! ${seededCount} animes adicionados.`,
      seededCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao popular dados populares', message: err.message },
      { status: 500 }
    );
  }
}
