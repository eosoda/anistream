import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET: Exportar backup JSON completo do banco de dados
export async function GET() {
  try {
    const animes = await prisma.anime.findMany({
      include: {
        episodes: {
          include: {
            sources: {
              include: {
                subtitles: true,
              },
            },
          },
        },
      },
    });

    const announcements = await prisma.systemAnnouncement.findMany();
    const releases = await prisma.changelogRelease.findMany();
    const webhooks = await prisma.webhookConfig.findMany();

    // Tratar BigInt para ser serializável em JSON
    const dump = JSON.parse(
      JSON.stringify(
        {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          data: {
            animes,
            announcements,
            releases,
            webhooks,
          },
        },
        (key, value) => (typeof value === 'bigint' ? value.toString() : value)
      )
    );

    return new NextResponse(JSON.stringify(dump, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=anistream-db-backup-${Date.now()}.json`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Importar backup JSON completo com Upsert
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data || !Array.isArray(data.animes)) {
      return NextResponse.json({ error: 'Formato de arquivo JSON de backup inválido.' }, { status: 400 });
    }

    let importedAnimes = 0;
    let importedEpisodes = 0;

    for (const animeData of data.animes) {
      const anime = await prisma.anime.upsert({
        where: { slug: animeData.slug || `anime-${animeData.id}` },
        update: {
          title: animeData.title,
          normalizedTitle: animeData.normalizedTitle || animeData.title.toLowerCase(),
          synopsis: animeData.synopsis || animeData.description,
          posterUrl: animeData.posterUrl,
          backdropUrl: animeData.backdropUrl,
          rating: animeData.rating || 8.0,
          year: animeData.year || animeData.releaseYear,
          status: animeData.status || 'AIRING',
          genres: animeData.genres,
        },
        create: {
          title: animeData.title,
          normalizedTitle: animeData.normalizedTitle || animeData.title.toLowerCase(),
          slug: animeData.slug || `anime-${animeData.id}`,
          synopsis: animeData.synopsis || animeData.description,
          posterUrl: animeData.posterUrl,
          backdropUrl: animeData.backdropUrl,
          rating: animeData.rating || 8.0,
          year: animeData.year || animeData.releaseYear,
          status: animeData.status || 'AIRING',
          genres: animeData.genres,
        },
      });

      importedAnimes++;

      if (Array.isArray(animeData.episodes)) {
        for (const epData of animeData.episodes) {
          const episode = await prisma.episode.upsert({
            where: {
              animeId_season_number: {
                animeId: anime.id,
                season: epData.season || 1,
                number: epData.number || 1,
              },
            },
            update: {
              title: epData.title,
              description: epData.description || epData.overview,
              thumbnailUrl: epData.thumbnailUrl,
            },
            create: {
              animeId: anime.id,
              season: epData.season || 1,
              number: epData.number || 1,
              title: epData.title,
              description: epData.description || epData.overview,
              thumbnailUrl: epData.thumbnailUrl,
            },
          });

          importedEpisodes++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backup restaurado com sucesso! ${importedAnimes} animes e ${importedEpisodes} episódios restaurados.`,
      importedAnimes,
      importedEpisodes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
