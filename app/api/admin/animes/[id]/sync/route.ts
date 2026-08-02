import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getAnimeCatalog, getAnimeEpisodes } from '@/lib/kenjitsu/catalog';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await context.params;
  try {
    const anime = await prisma.anime.findUnique({ where: { id: animeId } });
    if (!anime) return NextResponse.json({ error: 'Anime nao encontrado.' }, { status: 404 });

    const [metadata, episodeItems] = await Promise.all([
      getAnimeCatalog(anime.id),
      getAnimeEpisodes(anime.id),
    ]);

    await prisma.anime.update({
      where: { id: anime.id },
      data: {
        title: metadata.title,
        normalizedTitle: metadata.title ? metadata.title.toLowerCase() : anime.normalizedTitle,
        originalTitle: metadata.title_japanese || anime.originalTitle,
        description: metadata.synopsis,
        synopsis: metadata.synopsis,
        posterUrl: metadata.images?.jpg?.large_image_url || anime.posterUrl,
        backdropUrl: metadata.bannerImage || anime.backdropUrl,
        rating: metadata.score,
        year: metadata.year,
        releaseYear: metadata.year,
        status: metadata.status,
        genres: metadata.genres?.map((genre) => genre.name).join(', ') || anime.genres,
      },
    });

    if (episodeItems.length === 0) {
      return NextResponse.json(
        { error: 'O Kenjitsu nao retornou episodios para este anime.', syncedEpisodesCount: 0, createdSourcesCount: 0 },
        { status: 502 },
      );
    }

    let syncedEpisodesCount = 0;
    for (const item of episodeItems) {
      await prisma.episode.upsert({
        where: { animeId_season_number: { animeId: anime.id, season: 1, number: item.mal_id } },
        update: { title: item.title || `Episodio ${item.mal_id}` },
        create: { animeId: anime.id, season: 1, number: item.mal_id, title: item.title || `Episodio ${item.mal_id}` },
      });
      syncedEpisodesCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Sincronizacao de "${anime.title}" concluida pelo Kenjitsu: ${syncedEpisodesCount} episodios.`,
      animeTitle: anime.title,
      syncedEpisodesCount,
      createdSourcesCount: 0,
      sourceResolution: 'live-kenjitsu',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao sincronizar pelo Kenjitsu', details: error.message }, { status: 502 });
  }
}
