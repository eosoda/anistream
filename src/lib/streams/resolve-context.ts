import { prisma } from '@/lib/db/prisma';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { encryptData } from '@/lib/security/crypto';
import { EpisodeLookupInput, ResolveStreamResult, StreamSource } from './types';
import { getEnabledKenjitsuExtensions } from '@/lib/kenjitsu/settings';

export type EnabledProvider = {
  id: string;
  name: string;
};

export type OpeningInterval = {
  startSeconds: number;
  endSeconds: number;
  source: 'episode' | 'anime';
};

export interface StreamResolveContext {
  input: EpisodeLookupInput;
  enabledProviders: EnabledProvider[];
  adminDefaultProvider: EnabledProvider | null;
  opening: OpeningInterval | null;
}

export interface SafeAlternative {
  sourceId: string;
  provider: string;
  type: string;
  quality: string;
  audioLanguage: string;
  playbackUrl: string;
}

function buildPlaybackUrl(
  source: Pick<StreamSource, 'id' | 'url' | 'type' | 'headers' | 'requiresProxy'>,
  token: string
): string {
  if (source.type === 'embed') return source.url;

  if (
    source.requiresProxy &&
    (source.id.startsWith('kenjitsu:') ||
      source.id.startsWith('xpass-') ||
      source.id.startsWith('anime-sdk-') ||
      source.id.startsWith('consumet-'))
  ) {
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

export async function prepareStreamResolveContext(
  rawInput: EpisodeLookupInput
): Promise<StreamResolveContext> {
  const input: EpisodeLookupInput = {
    ...rawInput,
    aliases: rawInput.aliases ? [...rawInput.aliases] : undefined,
  };

  const [enabledExtensions, localAnime] = await Promise.all([
    getEnabledKenjitsuExtensions().catch(() => []),
    prisma.anime.findFirst({
      where: {
        OR: [
          { id: input.animeId },
          { slug: input.animeId },
          { identifiers: { some: { value: input.animeId } } },
        ],
      },
      include: {
        aliases: true,
        episodes: {
          where: { season: input.season, number: input.episode },
          take: 1,
        },
      },
    }).catch(() => null),
  ]);

  const enabledProviders: EnabledProvider[] = enabledExtensions.map((id) => ({ id, name: id }));
  const adminDefaultProvider = enabledProviders[0] ?? null;
  if (input.preferredProvider && !enabledProviders.some((provider) => provider.id === input.preferredProvider)) {
    input.preferredProvider = undefined;
  }

  if (localAnime && !input.animeTitle) {
    input.animeTitle = localAnime.title;
    input.originalTitle = input.originalTitle || localAnime.originalTitle || undefined;
    input.aliases = Array.from(
      new Set([
        ...(input.aliases || []),
        localAnime.title,
        localAnime.originalTitle || '',
        ...localAnime.aliases.map((alias: { value: string }) => alias.value),
      ])
    ).filter(Boolean);
  }

  const episodeOpening = localAnime?.episodes[0];
  const opening =
    episodeOpening?.openingStartSeconds != null && episodeOpening.openingEndSeconds != null
      ? {
          startSeconds: episodeOpening.openingStartSeconds,
          endSeconds: episodeOpening.openingEndSeconds,
          source: 'episode' as const,
        }
      : localAnime?.openingStartSeconds != null && localAnime.openingEndSeconds != null
        ? {
            startSeconds: localAnime.openingStartSeconds,
            endSeconds: localAnime.openingEndSeconds,
            source: 'anime' as const,
          }
        : null;

  return {
    input,
    enabledProviders,
    adminDefaultProvider,
    opening,
  };
}

export async function serializeStreamSource(source: StreamSource): Promise<SafeAlternative> {
  const token = await generatePlaybackToken(source.id, undefined, 15);
  return {
    sourceId: source.id,
    provider: source.provider,
    type: source.type,
    quality: source.quality || 'auto',
    audioLanguage: source.audioLanguage || 'ja',
    playbackUrl: buildPlaybackUrl(source, token),
  };
}

export async function serializeStreamResult(
  result: ResolveStreamResult,
  context: StreamResolveContext
) {
  if (!result.selected) return null;

  const selectedToken = await generatePlaybackToken(result.selected.id, undefined, 15);
  const [safeAlternatives, safeSelected] = await Promise.all([
    Promise.all(result.alternatives.map((source) => serializeStreamSource(source))),
    Promise.resolve({
      playbackUrl: buildPlaybackUrl(result.selected, selectedToken),
      provider: result.selected.provider,
      type: result.selected.type,
      quality: result.selected.quality || 'auto',
      audioLanguage: result.selected.audioLanguage || 'ja',
      subtitles: result.selected.subtitles || [],
    }),
  ]);

  return {
    ...safeSelected,
    alternatives: safeAlternatives,
    availableProviders: context.enabledProviders.map((provider) => provider.name),
    opening: context.opening,
    resolution: {
      phase: result.phase || 'complete',
      alternativesPending: result.alternativesPending ?? false,
      cacheHit: result.cacheHit ?? false,
    },
  };
}
