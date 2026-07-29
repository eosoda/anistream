import { NextRequest } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;

  // 1. Protection against excessive requests
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

    const input = parseResult.data;

    // 2. Resolve sources concurrently via StreamResolver
    const resolveResult = await defaultStreamResolver.resolveEpisodeStream(input);

    if (!resolveResult.selected) {
      return apiError(
        'NO_SOURCES_AVAILABLE',
        'Nenhuma fonte autorizada disponível para este episódio no momento.',
        444,
        { attempts: resolveResult.attempts },
        undefined,
        reqPath
      );
    }

    const selected = resolveResult.selected;

    // 3. Generate short-lived signed playback token (15 mins)
    const token = await generatePlaybackToken(selected.id, undefined, 15);

    // 4. Construct safe playback URL (embeds returned directly, direct streams proxied)
    const playbackUrl =
      selected.type === 'embed'
        ? selected.url
        : `/api/streams/proxy/${selected.id}?token=${encodeURIComponent(token)}`;

    // Map safe alternatives
    const safeAlternatives = await Promise.all(
      resolveResult.alternatives.map(async (alt) => {
        const altToken = await generatePlaybackToken(alt.id, undefined, 15);
        return {
          sourceId: alt.id,
          provider: alt.provider,
          quality: alt.quality || 'auto',
          audioLanguage: alt.audioLanguage || 'ja',
          playbackUrl:
            alt.type === 'embed'
              ? alt.url
              : `/api/streams/proxy/${alt.id}?token=${encodeURIComponent(altToken)}`,
        };
      })
    );

    const streamData = {
      playbackUrl,
      type: selected.type,
      quality: selected.quality || 'auto',
      audioLanguage: selected.audioLanguage || 'ja',
      subtitles: selected.subtitles || [],
      alternatives: safeAlternatives,
    };

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
      { message: err.message },
      undefined,
      reqPath
    );
  }
}
