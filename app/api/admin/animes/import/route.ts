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
    const { malId, anilistId, title } = body;

    if (!malId && !anilistId && !title) {
      return NextResponse.json(
        { error: 'Título ou ID do anime é obrigatório para importação' },
        { status: 400 }
      );
    }

    let meta: any = null;

    // 1. Se o modal enviou os metadados do card selecionado pelo usuário (title + posterUrl/description/releaseYear), usar diretamente
    if (body.title && (body.posterUrl || body.description || body.releaseYear)) {
      meta = {
        malId: body.malId ? Number(body.malId) : undefined,
        anilistId: body.anilistId ? Number(body.anilistId) : undefined,
        title: body.title,
        originalTitle: body.originalTitle || body.title,
        normalizedTitle: normalizeAnimeTitle(body.title),
        slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        posterUrl: body.posterUrl || null,
        bannerUrl: body.bannerUrl || body.posterUrl || null,
        releaseYear: body.releaseYear || new Date().getFullYear(),
        status: body.status || 'Em Lançamento',
        description: body.description || 'Sem sinopse.',
        episodesCount: body.episodesCount || 12,
        rating: body.rating || 8.0,
        genres: body.genres || '',
      };
    } else {
      // 2. Se for chamado via API externa por ID/Título, buscar via metadata-fetcher
      const searchTerms = title || (malId ? `mal:${malId}` : '');
      const metaList = await searchAnimeMetadata(searchTerms);

      if (metaList.length > 0) {
        meta = malId ? metaList.find((m) => m.malId === Number(malId)) || metaList[0] : metaList[0];
      }
    }

    if (!meta) {
      return NextResponse.json(
        { error: 'Anime não encontrado nas bases (AniList / Jikan / Kitsu)' },
        { status: 404 }
      );
    }

    // 3. Extrair e higienizar campos do anime
    const mainTitle = meta.title;
    const normTitle = meta.normalizedTitle || normalizeAnimeTitle(mainTitle);
    const slug =
      meta.slug ||
      mainTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      `anime-${Date.now()}`;

    // 4. Persistir Anime na tabela PostgreSQL
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

    // 5. Vincular AnimeIdentifier
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

    if (meta.anilistId) {
      await prisma.animeIdentifier.upsert({
        where: {
          provider_value: {
            provider: 'anilist',
            value: String(meta.anilistId),
          },
        },
        update: { animeId: anime.id },
        create: {
          animeId: anime.id,
          provider: 'anilist',
          value: String(meta.anilistId),
        },
      });
    }

    // Persistir todos os nomes alternativos / aliases na tabela AnimeAlias
    const allAliasesToSave = Array.from(
      new Set([
        mainTitle,
        meta.originalTitle,
        ...(meta.aliases || []),
        ...(body.aliases || []),
      ].filter(Boolean))
    );

    for (const aliasStr of allAliasesToSave) {
      const normVal = normalizeAnimeTitle(aliasStr);
      if (normVal) {
        await prisma.animeAlias.create({
          data: {
            animeId: anime.id,
            value: aliasStr,
            normalizedValue: normVal,
          },
        }).catch(() => {});
      }
    }

    // 6. Importar episódios e resolver fonte do episódio 1
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
      const count = Math.min(totalEpisodesCount, 28);
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
