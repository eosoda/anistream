import AnimeUnity from '@consumet/extensions/dist/providers/anime/animeunity';
import { normalizeAnimeTitle } from '../anime/normalize-title';
import { EpisodeLookupInput, StreamSource } from '../streams/types';
import { validateStreamSource } from '../streams/validator';

export const CONSUMET_PROVIDERS = [
  {
    name: 'AnimeUnity',
    key: 'animeunity',
    url: 'https://www.animeunity.to',
    priority: 93,
    enabled: true,
  },
] as const;

export type ConsumetProviderKey = (typeof CONSUMET_PROVIDERS)[number]['key'];

export function getConsumetProviderKey(name: string): ConsumetProviderKey | null {
  const normalized = name.toLowerCase();
  return (
    CONSUMET_PROVIDERS.find(
      (provider) =>
        normalized === provider.name.toLowerCase() || normalized.includes(provider.key)
    )?.key ?? null
  );
}

function titleOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const title = value as {
    english?: string;
    romaji?: string;
    userPreferred?: string;
    native?: string;
  };
  return (
    title.english ||
    title.romaji ||
    title.userPreferred ||
    title.native ||
    ''
  );
}

export async function resolveConsumetSources(
  key: ConsumetProviderKey,
  input: EpisodeLookupInput,
  priority: number,
  signal?: AbortSignal
): Promise<StreamSource[]> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Operação cancelada', 'AbortError');
  }

  if (key !== 'animeunity') return [];
  const provider = new AnimeUnity();
  const queries = [
    input.originalTitle,
    ...(input.aliases ?? []),
    input.animeTitle,
  ].filter((value): value is string => Boolean(value?.trim()));
  const normalizedTargets = new Set(queries.map(normalizeAnimeTitle));

  let results: Awaited<ReturnType<typeof provider.search>>['results'] = [];
  for (const query of queries) {
    const search = await provider.search(query);
    results = search.results ?? [];
    if (results.length) break;
  }
  if (!results.length) return [];

  const exact =
    results.find((result) =>
      normalizedTargets.has(normalizeAnimeTitle(titleOf(result.title)))
    ) ?? results[0];
  const info = await provider.fetchAnimeInfo(exact.id);
  const episode =
    info.episodes?.find((candidate) => Number(candidate.number) === input.episode) ??
    null;
  if (!episode) return [];

  const resolved = await provider.fetchEpisodeSources(episode.id);
  return (resolved.sources ?? []).map((source, index) => ({
    id: `consumet-${key}-${episode.id}-${index}`,
    provider: 'AnimeUnity',
    url: source.url,
    type: source.isM3U8 || source.url.includes('.m3u8') ? 'hls' : 'mp4',
    quality: source.quality || 'Auto',
    priority,
    audioLanguage: 'ja',
    headers: resolved.headers,
    requiresProxy: true,
    subtitles: resolved.subtitles?.map((subtitle) => ({
      language: subtitle.lang,
      label: subtitle.lang,
      url: subtitle.url,
      format: 'vtt',
    })),
  }));
}

export async function testConsumetProvider(
  key: ConsumetProviderKey,
  signal?: AbortSignal
): Promise<{ sourceCount: number }> {
  const sources = await resolveConsumetSources(
    key,
    {
      animeId: 'frieren-test',
      animeTitle: "Frieren: Beyond Journey's End",
      originalTitle: 'Sousou no Frieren',
      aliases: ['Sousou no Frieren'],
      season: 1,
      episode: 1,
      preferredAudio: 'ja',
    },
    100,
    signal
  );
  const validations = await Promise.all(
    sources.map((source) => validateStreamSource(source, 12_000))
  );
  const sourceCount = validations.filter((result) => result.valid).length;
  if (!sourceCount) {
    const reason = validations.find((result) => result.error)?.error;
    throw new Error(reason || 'O provedor não retornou um episódio reproduzível.');
  }
  return { sourceCount };
}
