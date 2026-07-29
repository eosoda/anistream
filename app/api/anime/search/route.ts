import { NextRequest } from 'next/server';
import { AnimeSearchInputSchema } from '@/schemas/anime';
import { LocalDatabaseProvider } from '@/lib/providers/local-database.provider';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';
import { globalCircuitBreaker } from '@/lib/api/circuit-breaker';

const localProvider = new LocalDatabaseProvider();

export async function GET(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;

  // 1. Rate Limit Check
  const rateLimit = checkRateLimit(request, 'search', {
    limit: 60,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMITED',
      'Muitas requisições de pesquisa. Tente novamente mais tarde.',
      429,
      undefined,
      undefined,
      reqPath
    );
  }

  // 2. Parâmetros da Query String
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limitStr = searchParams.get('limit') || '20';

  const parseResult = AnimeSearchInputSchema.safeParse({
    query: q,
    limit: parseInt(limitStr, 10),
  });

  if (!parseResult.success) {
    return apiError(
      'INVALID_SEARCH_PARAMS',
      'Parâmetros de busca inválidos.',
      400,
      parseResult.error.flatten(),
      undefined,
      reqPath
    );
  }

  const { query, limit } = parseResult.data;

  try {
    // Busca protegida pelo Circuit Breaker com fallback para banco local
    const { data: results, isFallback } = await globalCircuitBreaker.execute(
      'local-database-search',
      () => localProvider.searchAnime({ query, limit }),
      async () => []
    );

    return apiSuccess(results, {
      meta: {
        total: results.length,
        offline: isFallback,
      },
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    return apiError(
      'SEARCH_INTERNAL_ERROR',
      'Erro ao processar busca de animes.',
      500,
      { message: err.message },
      undefined,
      reqPath
    );
  }
}
