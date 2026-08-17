import { NextRequest } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';
import {
  prepareStreamResolveContext,
  serializeStreamSource,
} from '@/lib/streams/resolve-context';

export async function POST(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;
  const rateLimit = await checkDistributedRateLimit(`resolve-stream-alternatives:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMITED',
      'Limite de solicita\u00e7\u00f5es de fontes atingido. Aguarde 1 minuto.',
      429,
      undefined,
      rateLimitHeaders(rateLimit),
      reqPath
    );
  }

  try {
    const body = await request.json();
    const parseResult = EpisodeLookupInputSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        'INVALID_INPUT',
        'Entrada de busca de epis\u00f3dio inv\u00e1lida.',
        400,
        parseResult.error.flatten(),
        undefined,
        reqPath
      );
    }

    const context = await prepareStreamResolveContext({
      ...parseResult.data,
      preferredProvider: undefined,
      resolutionMode: 'complete',
    });
    context.input.preferredProvider = undefined;
    const result = await defaultStreamResolver.resolveEpisodeStream(
      context.input,
      9000,
      { mode: 'complete' }
    );

    const alternatives = await Promise.all(
      result.alternatives.map((source) => serializeStreamSource(source))
    );

    return apiSuccess(
      {
        alternatives,
        availableProviders: context.enabledProviders.map((provider) => provider.name),
        resolution: {
          phase: 'complete' as const,
          alternativesPending: false,
          cacheHit: result.cacheHit ?? false,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  } catch (err: any) {
    console.error('[Stream Alternatives Resolve Error]', err);
    return apiError(
      'INTERNAL_RESOLVE_ERROR',
      'Erro ao buscar fontes alternativas.',
      500,
      undefined,
      undefined,
      reqPath
    );
  }
}
