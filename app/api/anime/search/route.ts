import { NextRequest, NextResponse } from 'next/server';
import { AnimeSearchInputSchema } from '@/schemas/anime';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import type { LocalAnimeSearchItem, LocalAnimeSearchResponse } from '@/types/local-search';

const MAL_PROVIDERS = ['jikan', 'mal', 'myanimelist'];

interface SearchableAnime {
  title: string;
  normalizedTitle: string;
  originalTitle: string | null;
  posterUrl: string | null;
  releaseYear: number | null;
  year: number | null;
  rating: number | null;
  status: string | null;
  aliases: { value: string; normalizedValue: string }[];
  identifiers: { value: string }[];
  _count: { episodes: number };
}

function relevanceScore(
  anime: { title: string; normalizedTitle: string; originalTitle: string | null; aliases: { value: string; normalizedValue: string }[] },
  query: string,
  normalizedQuery: string
) {
  const normalizedTitle = anime.normalizedTitle || normalizeAnimeTitle(anime.title);
  const normalizedOriginal = normalizeAnimeTitle(anime.originalTitle || '');
  const aliases = anime.aliases.map((alias) => alias.normalizedValue || normalizeAnimeTitle(alias.value));
  if (normalizedTitle === normalizedQuery || normalizedOriginal === normalizedQuery) return 0;
  if (aliases.includes(normalizedQuery)) return 1;
  if (normalizedTitle.startsWith(normalizedQuery) || normalizedOriginal.startsWith(normalizedQuery)) return 2;
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 3;
  if (normalizedTitle.includes(normalizedQuery) || normalizedOriginal.includes(normalizedQuery)) return 4;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 5;
  return anime.title.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) ? 6 : 7;
}

export async function GET(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;
  const rateLimit = checkRateLimit(request, 'search', { limit: 60, windowMs: 60000 });
  if (!rateLimit.allowed) return apiError('RATE_LIMITED', 'Muitas requisições de pesquisa. Tente novamente mais tarde.', 429, undefined, undefined, reqPath);

  const parseResult = AnimeSearchInputSchema.safeParse({
    query: request.nextUrl.searchParams.get('q') || '',
    page: Number(request.nextUrl.searchParams.get('page') || '1'),
    limit: Number(request.nextUrl.searchParams.get('limit') || '20'),
  });
  if (!parseResult.success) return apiError('INVALID_SEARCH_PARAMS', 'Parâmetros de busca inválidos.', 400, parseResult.error.flatten(), undefined, reqPath);

  const { query, page, limit } = parseResult.data;
  const normalizedQuery = normalizeAnimeTitle(query);

  try {
    const matches = await prisma.anime.findMany({
      where: {
        AND: [
          { identifiers: { some: { provider: { in: MAL_PROVIDERS, mode: 'insensitive' } } } },
          { OR: [
            { normalizedTitle: { contains: normalizedQuery } },
            { title: { contains: query, mode: 'insensitive' } },
            { originalTitle: { contains: query, mode: 'insensitive' } },
            { aliases: { some: { normalizedValue: { contains: normalizedQuery } } } },
          ] },
        ],
      },
      include: {
        aliases: { select: { value: true, normalizedValue: true } },
        identifiers: { where: { provider: { in: MAL_PROVIDERS, mode: 'insensitive' } }, select: { value: true } },
        _count: { select: { episodes: true } },
      },
    });

    const ranked = (matches as SearchableAnime[])
      .map((anime: SearchableAnime) => {
        const identifier = anime.identifiers.find((item: { value: string }) => Number.isSafeInteger(Number(item.value)) && Number(item.value) > 0);
        return identifier ? { anime, malId: Number(identifier.value), score: relevanceScore(anime, query, normalizedQuery) } : null;
      })
      .filter((item): item is { anime: SearchableAnime; malId: number; score: number } => item !== null)
      .sort((a: { anime: SearchableAnime; score: number }, b: { anime: SearchableAnime; score: number }) => a.score - b.score || a.anime.title.localeCompare(b.anime.title, 'pt-BR'));

    const totalItems = ranked.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    const start = (page - 1) * limit;
    const data: LocalAnimeSearchItem[] = ranked.slice(start, start + limit).map(({ anime, malId }) => ({
      malId,
      title: anime.title,
      originalTitle: anime.originalTitle,
      posterUrl: anime.posterUrl,
      year: anime.releaseYear ?? anime.year,
      rating: anime.rating,
      status: anime.status,
      episodeCount: anime._count.episodes,
    }));
    const response: LocalAnimeSearchResponse = { data, pagination: { currentPage: page, totalPages, totalItems, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 } };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } });
  } catch (error) {
    return apiError('SEARCH_INTERNAL_ERROR', 'Erro ao processar busca de animes.', 500, { message: error instanceof Error ? error.message : 'Erro desconhecido' }, undefined, reqPath);
  }
}
