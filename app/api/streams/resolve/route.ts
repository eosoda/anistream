import { NextRequest } from 'next/server';
import { EpisodeLookupInputSchema } from '@/schemas/episode';
import { defaultStreamResolver } from '@/lib/streams/resolver';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { encryptData } from '@/lib/security/crypto';

function buildPlaybackUrl(
  source: {
    id: string;
    url: string;
    type: string;
    headers?: Record<string, string>;
    requiresProxy?: boolean;
  },
  token: string
): string {
  if (source.type === 'embed') return source.url;

  // Fontes descobertas sob demanda ainda não possuem EpisodeSource no banco.
  // O relay recebe um descritor autenticado/criptografado em vez de expor a
  // página do provedor no navegador.
  if (source.requiresProxy && (source.id.startsWith('xpass-') || source.id.startsWith('anime-sdk-') || source.id.startsWith('consumet-'))) {
    const payload = encryptData(
      JSON.stringify({
        sourceId: source.id,
        url: source.url,
        type: source.type,
        headers: source.headers || {},
      })
    );
    return `/api/streams/relay?token=${encodeURIComponent(token)}&payload=${encodeURIComponent(payload)}`;
  }

  return `/api/streams/proxy/${source.id}?token=${encodeURIComponent(token)}`;
}

export async function POST(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;

  // 1. Protection against excessive requests
  const rateLimit = checkRateLimit(request, 'resolve-stream', {
    limit: 30,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Limite de solicitações de stream atingido. Aguarde 1 minuto.', 429, undefined, undefined, reqPath);
  }

  try {
    const body = await request.json();
    const parseResult = EpisodeLookupInputSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError('INVALID_INPUT', 'Entrada de busca de episódio inválida.', 400, parseResult.error.flatten(), undefined, reqPath);
    }

    const input = parseResult.data;
    let opening: {
      startSeconds: number;
      endSeconds: number;
      source: 'episode' | 'anime';
    } | null = null;

    try {
      const openingAnime = await prisma.anime.findFirst({
        where: {
          OR: [{ id: input.animeId }, { slug: input.animeId }, { identifiers: { some: { value: input.animeId } } }],
        },
        include: {
          episodes: {
            where: { season: input.season, number: input.episode },
            take: 1,
          },
        },
      });
      const episodeOpening = openingAnime?.episodes[0];
      if (episodeOpening?.openingStartSeconds != null && episodeOpening.openingEndSeconds != null) {
        opening = {
          startSeconds: episodeOpening.openingStartSeconds,
          endSeconds: episodeOpening.openingEndSeconds,
          source: 'episode',
        };
      } else if (openingAnime?.openingStartSeconds != null && openingAnime.openingEndSeconds != null) {
        opening = {
          startSeconds: openingAnime.openingStartSeconds,
          endSeconds: openingAnime.openingEndSeconds,
          source: 'anime',
        };
      }
    } catch {
      // O stream continua disponível mesmo se os metadados locais estiverem offline.
    }

    // Enriquecer o input com o registro local. A URL pública usa normalmente o
    // MAL ID, enquanto Anime.id é um CUID; AnimeIdentifier faz essa ponte.
    if (!input.animeTitle && input.animeId) {
      try {
        const dbAnime = await prisma.anime.findFirst({
          where: {
            OR: [
              { id: input.animeId },
              { slug: input.animeId },
              {
                identifiers: {
                  some: {
                    provider: { in: ['mal', 'myanimelist', 'MAL'] },
                    value: input.animeId,
                  },
                },
              },
            ],
          },
          include: { aliases: true },
        });

        if (dbAnime) {
          input.animeTitle = dbAnime.title;
          input.originalTitle = input.originalTitle || dbAnime.originalTitle || undefined;
          input.aliases = Array.from(new Set([...(input.aliases || []), dbAnime.title, dbAnime.originalTitle || '', ...dbAnime.aliases.map((alias: { value: string }) => alias.value)])).filter(
            Boolean
          );
        }
      } catch {
        // ignora se db offline
      }
    }

    // 2. Resolve sources concurrently via StreamResolver
    const resolveResult = await defaultStreamResolver.resolveEpisodeStream(input);

    if (!resolveResult.selected) {
      return apiError('NO_SOURCES_AVAILABLE', 'Nenhuma fonte autorizada disponível para este episódio no momento.', 444, { attempts: resolveResult.attempts }, undefined, reqPath);
    }

    const selected = resolveResult.selected;

    // 3. Generate short-lived signed playback token (15 mins)
    const token = await generatePlaybackToken(selected.id, undefined, 15);

    // 4. Construct safe playback URL (embeds returned directly, direct streams proxied)
    const playbackUrl = buildPlaybackUrl(selected, token);

    // Map safe alternatives
    const safeAlternatives = await Promise.all(
      resolveResult.alternatives.map(async (alt) => {
        const altToken = await generatePlaybackToken(alt.id, undefined, 15);
        return {
          sourceId: alt.id,
          provider: alt.provider,
          type: alt.type,
          quality: alt.quality || 'auto',
          audioLanguage: alt.audioLanguage || 'ja',
          playbackUrl: buildPlaybackUrl(alt, altToken),
        };
      })
    );

    const streamData = {
      playbackUrl,
      provider: selected.provider,
      type: selected.type,
      quality: selected.quality || 'auto',
      audioLanguage: selected.audioLanguage || 'ja',
      subtitles: selected.subtitles || [],
      alternatives: safeAlternatives,
      opening,
    };

    return apiSuccess(streamData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_RESOLVE_ERROR', 'Erro ao resolver fontes de streaming.', 500, { message: err.message }, undefined, reqPath);
  }
}
