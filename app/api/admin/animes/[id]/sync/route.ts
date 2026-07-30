import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { defaultStreamResolver } from '@/lib/streams/resolver';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await context.params;

  try {
    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      include: {
        identifiers: true,
        episodes: {
          include: { sources: true },
        },
      },
    });

    if (!anime) {
      return NextResponse.json({ error: 'Anime não encontrado.' }, { status: 404 });
    }

    // Identificar MAL ID (se existir)
    const jikanIdent = anime.identifiers.find((i: any) => i.provider === 'jikan');
    let malId = jikanIdent ? parseInt(jikanIdent.value, 10) : 0;

    if (!malId) {
      try {
        const searchRes = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.title)}&limit=1`,
          { headers: { 'User-Agent': 'AniStream-AdminSync/1.0' } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const found = searchData.data?.[0];
          if (found?.mal_id) {
            malId = found.mal_id;
            await prisma.animeIdentifier.upsert({
              where: { provider_value: { provider: 'jikan', value: String(malId) } },
              update: { animeId: anime.id },
              create: { animeId: anime.id, provider: 'jikan', value: String(malId) },
            });
          }
        }
      } catch (e) {
        // Ignorar falha pontual
      }
    }

    // 1. Sincronizar Episódios
    let episodeItems: Array<{ number: number; title: string }> = [];

    if (malId) {
      try {
        const epRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes`, {
          headers: { 'User-Agent': 'AniStream-AdminSync/1.0' },
        });
        if (epRes.ok) {
          const epData = await epRes.json();
          if (Array.isArray(epData.data) && epData.data.length > 0) {
            episodeItems = epData.data.map((item: any) => ({
              number: item.mal_id,
              title: item.title || `Episódio ${item.mal_id}`,
            }));
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    if (episodeItems.length === 0) {
      if (anime.episodes.length > 0) {
        episodeItems = anime.episodes.map((ep: any) => ({
          number: ep.number,
          title: ep.title || `Episódio ${ep.number}`,
        }));
      } else {
        for (let i = 1; i <= 12; i++) {
          episodeItems.push({ number: i, title: `Episódio ${i}` });
        }
      }
    }

    let syncedEpisodesCount = 0;
    let createdSourcesCount = 0;

    for (const item of episodeItems) {
      const episode = await prisma.episode.upsert({
        where: {
          animeId_season_number: {
            animeId: anime.id,
            season: 1,
            number: item.number,
          },
        },
        update: {
          title: item.title,
        },
        create: {
          animeId: anime.id,
          season: 1,
          number: item.number,
          title: item.title,
        },
      });

      syncedEpisodesCount++;

      // 2. Sincronizar Fontes de Mídia (resolve EpisodeSource)
      try {
        const streamResult = await defaultStreamResolver.resolveEpisodeStream({
          animeId: String(malId || anime.id),
          season: 1,
          episode: item.number,
        });

        if (streamResult.selected) {
          const sel = streamResult.selected;
          await prisma.episodeSource.upsert({
            where: { id: `src-${episode.id}-${sel.provider}` },
            update: {
              urlEncrypted: sel.url,
              type: sel.type,
              quality: sel.quality || 'HD',
              audioLanguage: sel.audioLanguage || 'ja',
              enabled: true,
              lastCheckedAt: new Date(),
              lastStatus: 200,
            },
            create: {
              id: `src-${episode.id}-${sel.provider}`,
              episodeId: episode.id,
              provider: sel.provider,
              urlEncrypted: sel.url,
              type: sel.type,
              quality: sel.quality || 'HD',
              audioLanguage: sel.audioLanguage || 'ja',
              enabled: true,
              lastCheckedAt: new Date(),
              lastStatus: 200,
            },
          });
          createdSourcesCount++;
        }

        // Também salvar fontes alternativas
        for (const alt of streamResult.alternatives) {
          await prisma.episodeSource.upsert({
            where: { id: `src-${episode.id}-${alt.provider}` },
            update: {
              urlEncrypted: alt.url,
              type: alt.type,
              quality: alt.quality || 'HD',
              audioLanguage: alt.audioLanguage || 'ja',
              enabled: true,
              lastCheckedAt: new Date(),
              lastStatus: 200,
            },
            create: {
              id: `src-${episode.id}-${alt.provider}`,
              episodeId: episode.id,
              provider: alt.provider,
              urlEncrypted: alt.url,
              type: alt.type,
              quality: alt.quality || 'HD',
              audioLanguage: alt.audioLanguage || 'ja',
              enabled: true,
              lastCheckedAt: new Date(),
              lastStatus: 200,
            },
          });
          createdSourcesCount++;
        }
      } catch (err) {
        // Falha graciosa por episódio
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização de "${anime.title}" concluída! ${syncedEpisodesCount} episódios e ${createdSourcesCount} fontes atualizadas.`,
      animeTitle: anime.title,
      syncedEpisodesCount,
      createdSourcesCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao sincronizar episódios e fontes', details: err.message },
      { status: 500 }
    );
  }
}
