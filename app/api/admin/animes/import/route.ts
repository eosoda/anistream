import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import { searchAnimeMetadata } from '@/lib/anime/metadata-fetcher';
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

    let meta: any = null;

    // 1. Buscar metadados resilientes via AniList/Jikan/Kitsu
    const searchTerms = title || (malId ? `mal:${malId}` : '');
    const metaList = await searchAnimeMetadata(searchTerms);

    if (metaList.length > 0) {
      meta = malId ? metaList.find((m) => m.malId === malId) || metaList[0] : metaList[0];
    }

    // Se ainda não encontrou e malId foi informado, tentar Jikan direto com timeout
    if (!meta && malId) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
          headers: { 'User-Agent': 'AniStream-AdminImport/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const item = data.data;
          if (item) {
            const mainTitle = item.title_english || item.title || 'Anime Sem Título';
            meta = {
              malId: item.mal_id,
              title: mainTitle,
              originalTitle: item.title_japanese || item.title,
              normalizedTitle: normalizeAnimeTitle(mainTitle),
              slug: mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${item.mal_id}`,
              posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
              bannerUrl: item.images?.jpg?.large_image_url,
              releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : new Date().getFullYear()),
              status: item.status === 'Currently Airing' ? 'Em Lançamento' : 'Concluído',
              description: item.synopsis || 'Sem sinopse.',
              episodesCount: item.episodes || 12,
              rating: item.score || 8.0,
            };
          }
        }
      } catch (e) {
        // Ignorar timeout
      }
    }

    if (!meta) {
      return NextResponse.json(
        { error: 'Anime não encontrado nas bases (AniList / Jikan / Kitsu)' },
        { status: 404 }
      );
    }

    // 2. Extrair e higienizar campos do anime
    const mainTitle = meta.title;
    const normTitle = meta.normalizedTitle || normalizeAnimeTitle(mainTitle);
    const slug = meta.slug || mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // 3. Persistir Anime na tabela PostgreSQL
    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: meta.originalTitle || mainTitle,
        description: meta.description || 'Sem sinopse disponível.',
        synopsis: meta.description || 'Sem sinopse disponível.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating || 8.0,
        year: meta.releaseYear || new Date().getFullYear(),
        releaseYear: meta.releaseYear || new Date().getFullYear(),
        status: meta.status || 'Em Lançamento',
        genres: meta.genres || '',
      },
      create: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: meta.originalTitle || mainTitle,
        slug,
        description: meta.description || 'Sem sinopse disponível.',
        synopsis: meta.description || 'Sem sinopse disponível.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating || 8.0,
        year: meta.releaseYear || new Date().getFullYear(),
        releaseYear: meta.releaseYear || new Date().getFullYear(),
        status: meta.status || 'Em Lançamento',
        genres: meta.genres || '',
      },
    });

    // 4. Vincular AnimeIdentifier
    const targetMalId = meta.malId || malId;
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

    // 5. Importar lista de episódios
    const totalEpisodesCount = meta.episodesCount || 12;
    let importedEpisodesCount = 0;
    let createdSourcesCount = 0;

    let episodeItems: Array<{ number: number; title: string }> = [];

    if (targetMalId) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const epRes = await fetch(`https://api.jikan.moe/v4/anime/${targetMalId}/episodes`, {
          headers: { 'User-Agent': 'AniStream-AdminImport/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
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

      // Resolver fonte ativa do episódio 1
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
