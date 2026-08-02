import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import { searchAnimeMetadata } from '@/lib/anime/metadata-fetcher';
import { getAnimeEpisodes } from '@/lib/kenjitsu/catalog';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { malId, anilistId, title } = body;

    if (!malId && !anilistId && !title) {
      return NextResponse.json({ error: 'Titulo ou ID do anime e obrigatorio para importacao' }, { status: 400 });
    }

    let meta: any = null;
    if (body.title && (body.posterUrl || body.description || body.releaseYear)) {
      meta = {
        malId: body.malId ? Number(body.malId) : undefined,
        anilistId: body.anilistId ? Number(body.anilistId) : undefined,
        title: body.title,
        originalTitle: body.originalTitle || body.title,
        normalizedTitle: normalizeAnimeTitle(body.title),
        slug: body.slug || slugify(body.title),
        posterUrl: body.posterUrl || null,
        bannerUrl: body.bannerUrl || body.posterUrl || null,
        releaseYear: body.releaseYear || undefined,
        status: body.status || 'Em Lancamento',
        description: body.description || 'Sem sinopse.',
        episodesCount: body.episodesCount || undefined,
        rating: body.rating || undefined,
        genres: Array.isArray(body.genres) ? body.genres.join(', ') : body.genres || '',
        aliases: body.aliases || [],
      };
    } else {
      const searchTerms = anilistId ? `anilist:${anilistId}` : malId ? `mal:${malId}` : String(title);
      const results = await searchAnimeMetadata(searchTerms);
      meta = results.find((item) =>
        (anilistId && item.anilistId === Number(anilistId)) || (malId && item.malId === Number(malId)),
      ) || results[0] || null;
    }

    if (!meta) {
      return NextResponse.json({ error: 'Anime nao encontrado no catalogo do Kenjitsu' }, { status: 404 });
    }

    const mainTitle = String(meta.title);
    const normTitle = meta.normalizedTitle || normalizeAnimeTitle(mainTitle);
    const slug = meta.slug || slugify(mainTitle) || `anime-${Date.now()}`;
    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: meta.originalTitle || mainTitle,
        description: meta.description || 'Sem sinopse disponivel.',
        synopsis: meta.description || 'Sem sinopse disponivel.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating ?? null,
        year: meta.releaseYear || null,
        releaseYear: meta.releaseYear || null,
        status: meta.status || null,
        genres: meta.genres || '',
      },
      create: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: meta.originalTitle || mainTitle,
        slug,
        description: meta.description || 'Sem sinopse disponivel.',
        synopsis: meta.description || 'Sem sinopse disponivel.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating ?? null,
        year: meta.releaseYear || null,
        releaseYear: meta.releaseYear || null,
        status: meta.status || null,
        genres: meta.genres || '',
      },
    });

    const identifiers = [
      meta.malId ? { provider: 'mal', value: String(meta.malId) } : null,
      meta.anilistId ? { provider: 'anilist', value: String(meta.anilistId) } : null,
      meta.anilistId ? { provider: 'kenjitsu', value: String(meta.anilistId) } : null,
    ].filter(Boolean) as Array<{ provider: string; value: string }>;
    for (const identifier of identifiers) {
      await prisma.animeIdentifier.upsert({
        where: { provider_value: identifier },
        update: { animeId: anime.id },
        create: { animeId: anime.id, ...identifier },
      });
    }

    const aliases = Array.from(new Set([mainTitle, meta.originalTitle, ...(meta.aliases || []), ...(body.aliases || [])].filter(Boolean)));
    for (const alias of aliases) {
      const normalizedValue = normalizeAnimeTitle(String(alias));
      if (!normalizedValue) continue;
      await prisma.animeAlias.create({
        data: { animeId: anime.id, value: String(alias), normalizedValue },
      }).catch(() => undefined);
    }

    const sourceId = meta.anilistId || meta.malId || body.anilistId || body.malId;
    const episodeItems = sourceId ? await getAnimeEpisodes(sourceId) : [];
    let importedEpisodesCount = 0;
    for (const item of episodeItems) {
      await prisma.episode.upsert({
        where: { animeId_season_number: { animeId: anime.id, season: 1, number: item.mal_id } },
        update: { title: item.title || `Episodio ${item.mal_id}` },
        create: { animeId: anime.id, season: 1, number: item.mal_id, title: item.title || `Episodio ${item.mal_id}` },
      });
      importedEpisodesCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Anime "${mainTitle}" importado com ${importedEpisodesCount} episodios do Kenjitsu.`,
      anime,
      episodesCount: importedEpisodesCount,
      sourceResolution: 'live-kenjitsu',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao importar anime', details: error.message }, { status: 502 });
  }
}
