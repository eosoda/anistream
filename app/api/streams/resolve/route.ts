import { NextRequest } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';
import {
  prepareStreamResolveContext,
  serializeStreamResult,
} from '@/lib/streams/resolve-context';

export async function POST(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;
  const rateLimit = await checkDistributedRateLimit(`resolve-stream:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMITED',
      'Limite de solicitações de stream atingido. Aguarde 1 minuto.',
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
        'Entrada de busca de episódio inválida.',
        400,
        parseResult.error.flatten(),
        undefined,
        reqPath
      );
    }

    const context = await prepareStreamResolveContext({
      ...parseResult.data,
      resolutionMode: 'fast',
    });
    const result = await defaultStreamResolver.resolveEpisodeStream(
      { ...context.input, resolutionMode: 'fast' },
      9000,
      { mode: 'fast', validationTimeoutMs: 1800 }
    );

    // Apenas quando o caminho rápido falha, fazemos a resolução completa de
    // scrapers/arquivos configurados para não penalizar episódios saudáveis.
    if (!result?.selected) {
      return apiError(
        'NO_SOURCES_AVAILABLE',
        'Nenhuma fonte autorizada disponível para este episódio no momento.',
        444,
        undefined,
        undefined,
        reqPath
      );
    }

    const streamData = await serializeStreamResult(result, context);
    return apiSuccess(streamData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (err: any) {
    console.error('[Stream Resolve Error]', err);
    return apiError(
      'INTERNAL_RESOLVE_ERROR',
      'Erro ao resolver fontes de streaming.',
      500,
      undefined,
      rateLimitHeaders(rateLimit),
      reqPath
    );
  }
}
