import { NextRequest } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';
import {
  prepareStreamResolveContext,
  serializeStreamResult,
} from '@/lib/streams/resolve-context';

export async function POST(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;
  const rateLimit = checkRateLimit(request, 'resolve-stream', {
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return apiError(
      'RATE_LIMITED',
      'Limite de solicitações de stream atingido. Aguarde 1 minuto.',
      429,
      undefined,
      undefined,
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
    const preferredCandidates = Array.from(
      new Set(
        [
          context.input.preferredProvider,
          context.adminDefaultProvider?.name,
          undefined,
        ].filter((value): value is string | undefined => value !== null)
      )
    );

    let result = null;
    for (const preferredProvider of preferredCandidates) {
      const candidateInput = {
        ...context.input,
        preferredProvider,
        resolutionMode: 'fast' as const,
      };
      const candidateResult = await defaultStreamResolver.resolveEpisodeStream(
        candidateInput,
        4500,
        { mode: 'fast', validationTimeoutMs: 1800 }
      );
      if (candidateResult.selected) {
        result = candidateResult;
        break;
      }
      result = candidateResult;
    }

    // Apenas quando o caminho rápido falha, fazemos a resolução completa de
    // scrapers/arquivos configurados para não penalizar episódios saudáveis.
    if (!result?.selected) {
      result = await defaultStreamResolver.resolveEpisodeStream(
        { ...context.input, preferredProvider: undefined, resolutionMode: 'complete' },
        9000,
        { mode: 'complete' }
      );
    }

    if (!result?.selected) {
      return apiError(
        'NO_SOURCES_AVAILABLE',
        'Nenhuma fonte autorizada disponível para este episódio no momento.',
        444,
        { attempts: result?.attempts || [] },
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
    return apiError(
      'INTERNAL_RESOLVE_ERROR',
      'Erro ao resolver fontes de streaming.',
      500,
      { message: err?.message || 'Erro desconhecido' },
      undefined,
      reqPath
    );
  }
}
