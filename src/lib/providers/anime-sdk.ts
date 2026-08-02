import {
  AnimeParadiseProvider,
  AnikotoProvider,
  BaseProvider,
  GogoanimeProvider,
  GoyabuProvider,
  HttpClient,
  MegaPlayProvider,
} from 'anime-sdk';
import { EpisodeLookupInput, StreamSource } from '../streams/types';
import { validateStreamSource } from '../streams/validator';

export const ANIME_SDK_PROVIDERS = [
  { name: 'MegaPlay', key: 'megaplay', url: 'https://megaplay.buzz', priority: 98, enabled: true },
  {
    name: 'AnimeParadise',
    key: 'animeparadise',
    url: 'https://www.animeparadise.moe',
    priority: 96,
    enabled: true,
  },
  {
    name: 'GogoAnime (AnimeSDK)',
    key: 'gogoanime',
    url: 'https://anineko.to',
    priority: 94,
    enabled: true,
  },
  { name: 'Anikoto', key: 'anikoto', url: 'https://anikoto.to', priority: 92, enabled: false },
  { name: 'Goyabu PT-BR', key: 'goyabu', url: 'https://goyabu.to', priority: 90, enabled: true },
] as const;

export type AnimeSdkProviderKey = (typeof ANIME_SDK_PROVIDERS)[number]['key'];

function createProvider(key: AnimeSdkProviderKey, signal?: AbortSignal, fast = false): BaseProvider {
  const http = new HttpClient({
    timeoutMs: fast ? 4_500 : 12_000,
    retry: fast
      ? { maxAttempts: 1, initialDelayMs: 0 }
      : { maxAttempts: 2, initialDelayMs: 200 },
  });

  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Operação cancelada', 'AbortError');
  }

  switch (key) {
    case 'megaplay':
      return new MegaPlayProvider(http);
    case 'animeparadise':
      return new AnimeParadiseProvider(http);
    case 'gogoanime':
      return new GogoanimeProvider(http);
    case 'anikoto':
      return new AnikotoProvider(http);
    case 'goyabu':
      return new GoyabuProvider(http);
  }
}

export function getAnimeSdkProviderKey(name: string): AnimeSdkProviderKey | null {
  const normalized = name.toLowerCase();
  return (
    ANIME_SDK_PROVIDERS.find(
      (provider) =>
        normalized === provider.name.toLowerCase() || normalized.includes(provider.key)
    )?.key ?? null
  );
}

export async function resolveAnimeSdkSources(
  key: AnimeSdkProviderKey,
  input: EpisodeLookupInput,
  priority: number,
  signal?: AbortSignal
): Promise<StreamSource[]> {
  const provider = createProvider(key, signal, input.resolutionMode === 'fast');
  const queries = [
    input.animeTitle,
    input.originalTitle,
    ...(input.aliases ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));

  let hits: Awaited<ReturnType<BaseProvider['search']>> = [];
  for (const query of queries) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Operação cancelada', 'AbortError');
    hits = await provider.search(query, { signal });
    if (hits.length) break;
  }
  if (!hits.length) return [];

  const targetTitles = queries.map((title) => title.toLowerCase());
  const media =
    hits.find((hit) =>
      targetTitles.some(
        (title) =>
          hit.title.toLowerCase() === title ||
          hit.title.toLowerCase().includes(title) ||
          title.includes(hit.title.toLowerCase())
      )
    ) ?? hits[0];

  if (signal?.aborted) throw signal.reason ?? new DOMException('Operação cancelada', 'AbortError');
  const units = await provider.fetchContentUnits(media.id, { signal });
  const unit =
    units.find((candidate) => candidate.number === input.episode) ??
    units.find((candidate) => Math.abs(candidate.number - input.episode) < 0.001);
  if (!unit) return [];

  const preferredLanguage =
    input.preferredAudio === 'en' ? 'dub' : input.preferredAudio === 'ja' ? 'sub' : undefined;
  if (signal?.aborted) throw signal.reason ?? new DOMException('Operação cancelada', 'AbortError');
  const resolved = await provider.resolveStream(unit.id, preferredLanguage, { signal });
  if (resolved.type !== 'video') return [];

  return resolved.streams.map((stream, index) => ({
    id: `anime-sdk-${key}-${unit.id}-${index}`,
    provider: ANIME_SDK_PROVIDERS.find((item) => item.key === key)?.name ?? key,
    url: stream.sourceUrl,
    type: stream.isHLS ? 'hls' : 'mp4',
    quality: stream.quality,
    priority,
    audioLanguage:
      key === 'goyabu'
        ? 'pt-BR'
        : stream.language === 'dub'
          ? 'en'
          : stream.language === 'sub'
            ? 'ja'
            : 'unknown',
    headers: stream.headers,
    requiresProxy: true,
    subtitles: stream.subtitles?.map((subtitle) => ({
      language: subtitle.language,
      label: subtitle.label,
      url: subtitle.url,
      format: subtitle.format ?? 'vtt',
    })),
  }));
}

export async function testAnimeSdkProvider(
  key: AnimeSdkProviderKey,
  signal?: AbortSignal
): Promise<{ sourceCount: number }> {
  const sources = await resolveAnimeSdkSources(
    key,
    {
      animeId: 'frieren-test',
      animeTitle: 'Frieren',
      season: 1,
      episode: 1,
      preferredAudio: 'ja',
    },
    100,
    signal
  );
  if (!sources.length) {
    throw new Error('O provedor não retornou mídia para Frieren, episódio 1.');
  }
  const validations = await Promise.all(
    sources.map((source) => validateStreamSource(source, 12_000))
  );
  const sourceCount = validations.filter((result) => result.valid).length;
  if (!sourceCount) {
    const reason = validations.find((result) => result.error)?.error;
    throw new Error(reason || 'A mídia retornada não é reproduzível.');
  }
  return { sourceCount };
}
