import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAnimeEpisodes, getTopAnime } from '@/lib/kenjitsu/catalog';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST() {
  try {
    const catalog = await getTopAnime('popular', 1, 25);
    let seededCount = 0;
    let episodeCount = 0;

    for (const animeData of catalog.data) {
      const title = animeData.title || animeData.title_english || animeData.title_japanese || 'Anime sem titulo';
      const slug = slugify(title) || `anime-${animeData.kenjitsu?.anilistId || animeData.mal_id}`;
      const anime = await prisma.anime.upsert({
        where: { slug },
        update: {
          title,
          normalizedTitle: title.toLowerCase(),
          originalTitle: animeData.title_japanese,
          synopsis: animeData.synopsis,
          description: animeData.synopsis,
          posterUrl: animeData.images?.jpg?.large_image_url || null,
          backdropUrl: animeData.bannerImage || null,
          rating: animeData.score,
          year: animeData.year,
          releaseYear: animeData.year,
          status: animeData.status,
          genres: animeData.genres?.map((genre) => genre.name).join(', '),
        },
        create: {
          title,
          normalizedTitle: title.toLowerCase(),
          originalTitle: animeData.title_japanese,
          slug,
          synopsis: animeData.synopsis,
          description: animeData.synopsis,
          posterUrl: animeData.images?.jpg?.large_image_url || null,
          backdropUrl: animeData.bannerImage || null,
          rating: animeData.score,
          year: animeData.year,
          releaseYear: animeData.year,
          status: animeData.status,
          genres: animeData.genres?.map((genre) => genre.name).join(', '),
        },
      });

      for (const identifier of [
        animeData.kenjitsu?.malId ? { provider: 'mal', value: String(animeData.kenjitsu.malId) } : null,
        animeData.kenjitsu?.anilistId ? { provider: 'anilist', value: String(animeData.kenjitsu.anilistId) } : null,
        animeData.kenjitsu?.anilistId ? { provider: 'kenjitsu', value: String(animeData.kenjitsu.anilistId) } : null,
      ].filter(Boolean) as Array<{ provider: string; value: string }>) {
        await prisma.animeIdentifier.upsert({
          where: { provider_value: identifier },
          update: { animeId: anime.id },
          create: { animeId: anime.id, ...identifier },
        });
      }

      const episodes = await getAnimeEpisodes(animeData.kenjitsu?.anilistId || animeData.mal_id);
      for (const episode of episodes) {
        await prisma.episode.upsert({
          where: { animeId_season_number: { animeId: anime.id, season: 1, number: episode.mal_id } },
          update: { title: episode.title },
          create: { animeId: anime.id, season: 1, number: episode.mal_id, title: episode.title },
        });
        episodeCount++;
      }
      seededCount++;
    }

    return NextResponse.json({ success: true, message: `Catalogo Kenjitsu populado com ${seededCount} animes.`, seededCount, episodeCount });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao popular catalogo pelo Kenjitsu', message: error.message }, { status: 502 });
  }
}
