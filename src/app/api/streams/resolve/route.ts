import { NextRequest, NextResponse } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  // 1. Protection against excessive requests
  const rateLimit = checkRateLimit(request, 'resolve-stream', {
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de solicitações de stream atingido. Aguarde 1 minuto.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = EpisodeLookupInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Entrada inválida', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // 2. Resolve sources concurrently via StreamResolver
    const resolveResult = await defaultStreamResolver.resolveEpisodeStream(
      input
    );

    if (!resolveResult.selected) {
      return NextResponse.json(
        {
          error: 'Nenhuma fonte autorizada disponível para este episódio no momento.',
          attempts: resolveResult.attempts,
        },
        { status: 444 }
      );
    }

    const selected = resolveResult.selected;

    // 3. Generate short-lived signed playback token (15 mins)
    const token = await generatePlaybackToken(selected.id, undefined, 15);

    // 4. Construct safe playback URL (never exposing raw internal media URL)
    const playbackUrl = `/api/streams/proxy/${selected.id}?token=${encodeURIComponent(
      token
    )}`;

    // Map safe alternatives
    const safeAlternatives = await Promise.all(
      resolveResult.alternatives.map(async (alt) => {
        const altToken = await generatePlaybackToken(alt.id, undefined, 15);
        return {
          sourceId: alt.id,
          provider: alt.provider,
          quality: alt.quality || 'auto',
          audioLanguage: alt.audioLanguage || 'ja',
          playbackUrl: `/api/streams/proxy/${alt.id}?token=${encodeURIComponent(
            altToken
          )}`,
        };
      })
    );

    return NextResponse.json({
      playbackUrl,
      type: selected.type,
      quality: selected.quality || 'auto',
      audioLanguage: selected.audioLanguage || 'ja',
      subtitles: selected.subtitles || [],
      alternatives: safeAlternatives,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao resolver fontes de streaming', message: err.message },
      { status: 500 }
    );
  }
}
