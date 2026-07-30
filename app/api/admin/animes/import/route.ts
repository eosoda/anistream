import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import { defaultStreamResolver } from '@/lib/streams/resolver';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { malId, title } = body;

    if (!malId && !title) {
      return NextResponse.json(
        { error: 'MAL ID ou Título é obrigatório para importação' },
        { status: 400 }
      );
    }

    let targetMalId = malId;
    let animeInfo: any = null;

    // 1. Buscar metadados no Jikan por malId ou busca por título
    if (targetMalId) {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${targetMalId}`, {
        headers: { 'User-Agent': 'AniStream-AdminImport/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        animeInfo = data.data;
      }
    }

    if (!animeInfo && title) {
      const res = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`,
        { headers: { 'User-Agent': 'AniStream-AdminImport/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        animeInfo = data.data?.[0];
        targetMalId = animeInfo?.mal_id;
      }
    }

    if (!animeInfo) {
      return NextResponse.json(
        { error: 'Anime não encontrado nas bases do MyAnimeList / Jikan' },
        { status: 404 }
      );
    }

    // 2. Extrair e higienizar campos do anime
    const mainTitle = animeInfo.title_english || animeInfo.title || 'Anime Sem Título';
    const normTitle = normalizeAnimeTitle(mainTitle);
    const slug =
      mainTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `anime-${animeInfo.mal_id}`;

    const posterUrl =
      animeInfo.images?.jpg?.large_image_url ||
      animeInfo.images?.jpg?.image_url ||
      null;

    const backdropUrl =
      animeInfo.images?.jpg?.large_image_url || posterUrl;

    const genresList = (animeInfo.genres || [])
      .map((g: any) => g.name)
      .join(', ');

    // 3. Persistir Anime na tabela PostgreSQL
    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: animeInfo.title_japanese || animeInfo.title,
        description: animeInfo.synopsis || 'Sem sinopse disponível.',
        synopsis: animeInfo.synopsis || 'Sem sinopse disponível.',
        posterUrl,
        backdropUrl,
        rating: animeInfo.score || 8.0,
        year: animeInfo.year || (animeInfo.aired?.from ? new Date(animeInfo.aired.from).getFullYear() : new Date().getFullYear()),
        releaseYear: animeInfo.year || (animeInfo.aired?.from ? new Date(animeInfo.aired.from).getFullYear() : new Date().getFullYear()),
        status: animeInfo.status === 'Currently Airing' ? 'Em Lançamento' : 'Concluído',
        genres: genresList,
      },
      create: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: animeInfo.title_japanese || animeInfo.title,
        slug,
        description: animeInfo.synopsis || 'Sem sinopse disponível.',
        synopsis: animeInfo.synopsis || 'Sem sinopse disponível.',
        posterUrl,
        backdropUrl,
        rating: animeInfo.score || 8.0,
        year: animeInfo.year || (animeInfo.aired?.from ? new Date(animeInfo.aired.from).getFullYear() : new Date().getFullYear()),
        releaseYear: animeInfo.year || (animeInfo.aired?.from ? new Date(animeInfo.aired.from).getFullYear() : new Date().getFullYear()),
        status: animeInfo.status === 'Currently Airing' ? 'Em Lançamento' : 'Concluído',
        genres: genresList,
      },
    });

    // 4. Vincular AnimeIdentifier
    if (targetMalId) {
      await prisma.animeIdentifier.upsert({
        where: {
          provider_value: {
            provider: 'jikan',
            value: String(targetMalId),
          },
        },
        update: { animeId: anime.id },
        create: {
          animeId: anime.id,
          provider: 'jikan',
          value: String(targetMalId),
        },
      });
    }

    // 5. Buscar e Importar lista de Episódios
    const totalEpisodesCount = animeInfo.episodes || 12;
    let importedEpisodesCount = 0;
    let createdSourcesCount = 0;

    let episodeItems: Array<{ number: number; title: string }> = [];

    if (targetMalId) {
      try {
        const epRes = await fetch(`https://api.jikan.moe/v4/anime/${targetMalId}/episodes`, {
          headers: { 'User-Agent': 'AniStream-AdminImport/1.0' },
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
      const count = Math.min(totalEpisodesCount, 24);
      for (let i = 1; i <= count; i++) {
        episodeItems.push({ number: i, title: `Episódio ${i}` });
      }
    }

    for (const epItem of episodeItems) {
      const episode = await prisma.episode.upsert({
        where: {
          animeId_season_number: {
            animeId: anime.id,
            season: 1,
            number: epItem.number,
          },
        },
        update: {
          title: epItem.title,
        },
        create: {
          animeId: anime.id,
          season: 1,
          number: epItem.number,
          title: epItem.title,
        },
      });

      importedEpisodesCount++;

      // Tentar resolver fontes ativas dos provedores cadastrados para o episódio 1
      if (epItem.number === 1) {
        try {
          const resolution = await defaultStreamResolver.resolveEpisodeStream({
            animeId: String(targetMalId || anime.id),
            season: 1,
            episode: 1,
          });

          if (resolution.selected) {
            const src = resolution.selected;
            await prisma.episodeSource.upsert({
              where: { id: `src-${episode.id}-${src.provider}` },
              update: {
                urlEncrypted: src.url,
                type: src.type,
                quality: src.quality || 'HD',
                enabled: true,
              },
              create: {
                id: `src-${episode.id}-${src.provider}`,
                episodeId: episode.id,
                provider: src.provider,
                urlEncrypted: src.url,
                type: src.type,
                quality: src.quality || 'HD',
                audioLanguage: src.audioLanguage || 'ja',
                enabled: true,
              },
            });
            createdSourcesCount++;
          }
        } catch (err) {
          // Resolução graciosa
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Anime "${mainTitle}" importado com sucesso com ${importedEpisodesCount} episódios!`,
      anime,
      episodesCount: importedEpisodesCount,
      sourcesCount: createdSourcesCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao importar anime', details: err.message },
      { status: 500 }
    );
  }
}
