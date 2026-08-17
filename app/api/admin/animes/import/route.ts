import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import { searchAnimeMetadata } from '@/lib/anime/metadata-fetcher';
import { getAnimeEpisodes } from '@/lib/kenjitsu/catalog';
import { recordAdminAudit } from '@/lib/admin/audit';
import { toPlainText } from '@/utils/formatters';
import { readJsonBodyLimited, InvalidJsonBodyError, RequestBodyTooLargeError } from '@/lib/security/body-limit';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function cleanImportedText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? toPlainText(value) || fallback : fallback;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const rawBody = await readJsonBodyLimited(request, 256 * 1024);
    const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
      ? rawBody as Record<string, any>
      : {};
    const { malId, anilistId, title } = body;

    if (!malId && !anilistId && !title) {
      return NextResponse.json({ error: 'Titulo ou ID do anime e obrigatorio para importacao' }, { status: 400 });
    }

    let meta: any = null;
    if (body.title && (body.posterUrl || body.description || body.releaseYear)) {
      meta = {
        malId: body.malId ? Number(body.malId) : undefined,
        anilistId: body.anilistId ? Number(body.anilistId) : undefined,
        title: cleanImportedText(body.title, 'Anime sem titulo'),
        originalTitle: cleanImportedText(body.originalTitle || body.title, cleanImportedText(body.title, 'Anime sem titulo')),
        normalizedTitle: normalizeAnimeTitle(cleanImportedText(body.title, 'Anime sem titulo')),
        slug: cleanImportedText(body.slug) || slugify(cleanImportedText(body.title, 'anime')),
        posterUrl: body.posterUrl || null,
        bannerUrl: body.bannerUrl || body.posterUrl || null,
        releaseYear: body.releaseYear || undefined,
        status: cleanImportedText(body.status, 'Em Lancamento'),
        description: toPlainText(body.description) || 'Sem sinopse.',
        episodesCount: body.episodesCount || undefined,
        rating: body.rating || undefined,
        genres: Array.isArray(body.genres)
          ? body.genres.map((genre: unknown) => cleanImportedText(genre)).filter(Boolean).join(', ')
          : cleanImportedText(body.genres),
        aliases: Array.isArray(body.aliases) ? body.aliases.map((alias: unknown) => cleanImportedText(alias)).filter(Boolean) : [],
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

    const mainTitle = cleanImportedText(meta.title, 'Anime sem titulo');
    const normTitle = meta.normalizedTitle || normalizeAnimeTitle(mainTitle);
    const slug = cleanImportedText(meta.slug) || slugify(mainTitle) || `anime-${Date.now()}`;
    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: cleanImportedText(meta.originalTitle, mainTitle),
        description: toPlainText(meta.description) || 'Sem sinopse disponivel.',
        synopsis: toPlainText(meta.description) || 'Sem sinopse disponivel.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating ?? null,
        year: meta.releaseYear || null,
        releaseYear: meta.releaseYear || null,
        status: cleanImportedText(meta.status) || null,
        genres: cleanImportedText(meta.genres),
      },
      create: {
        title: mainTitle,
        normalizedTitle: normTitle,
        originalTitle: cleanImportedText(meta.originalTitle, mainTitle),
        slug,
        description: toPlainText(meta.description) || 'Sem sinopse disponivel.',
        synopsis: toPlainText(meta.description) || 'Sem sinopse disponivel.',
        posterUrl: meta.posterUrl || null,
        backdropUrl: meta.bannerUrl || meta.posterUrl || null,
        rating: meta.rating ?? null,
        year: meta.releaseYear || null,
        releaseYear: meta.releaseYear || null,
        status: cleanImportedText(meta.status) || null,
        genres: cleanImportedText(meta.genres),
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

    const aliases = Array.from(new Set([
      mainTitle,
      cleanImportedText(meta.originalTitle),
      ...(Array.isArray(meta.aliases) ? meta.aliases.map((alias: unknown) => cleanImportedText(alias)) : []),
      ...(Array.isArray(body.aliases) ? body.aliases.map((alias: unknown) => cleanImportedText(alias)) : []),
    ].filter(Boolean)));
    for (const alias of aliases) {
      const normalizedValue = normalizeAnimeTitle(String(alias));
      if (!normalizedValue) continue;
      await prisma.animeAlias.create({
        data: { animeId: anime.id, value: cleanImportedText(alias), normalizedValue },
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

    void recordAdminAudit({
      actorId: auth.userId,
      action: 'anime.imported',
      resourceType: 'anime',
      resourceId: anime.id,
      summary: `Anime “${mainTitle}” importado pelo Kenjitsu.`,
      metadata: { importedEpisodesCount, sourceResolution: 'live-kenjitsu', malId: meta.malId || null, anilistId: meta.anilistId || null },
    });

    return NextResponse.json({
      success: true,
      message: `Anime "${mainTitle}" importado com ${importedEpisodesCount} episodios do Kenjitsu.`,
      anime,
      episodesCount: importedEpisodesCount,
      sourceResolution: 'live-kenjitsu',
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Arquivo de importação excede o limite permitido.' }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: 'Dados de importação inválidos.' }, { status: 400 });
    console.error('[Admin Anime Import Error]', error);
    return NextResponse.json({ error: 'Não foi possível importar o anime.' }, { status: 502 });
  }
}
