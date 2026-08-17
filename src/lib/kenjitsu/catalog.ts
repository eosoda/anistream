import { prisma } from '@/lib/db/prisma';
import type { JikanAnime, JikanCharacter, JikanEpisode, JikanRelation } from '@/types/anime';
import type { LocalAnimeSearchItem, LocalAnimeSearchResponse } from '@/types/local-search';
import { kenjitsuClient, KenjitsuRequestError } from './client';
import { getEnabledKenjitsuExtensions } from './settings';
import { mapWithConcurrency } from './concurrency';
import { toPlainText } from '@/utils/formatters';
import type {
  KenjitsuExtensionId,
  KenjitsuExtensionSearchItem,
  KenjitsuMetaAnime,
} from './types';

type AnimeInputId = string | number;

function cleanText(value: string | null | undefined, fallback = ''): string {
  return toPlainText(value) || fallback;
}

function cleanUnknownText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? cleanText(value, fallback) : fallback;
}

function cleanTextList(values: readonly (string | null | undefined)[] | null | undefined): string[] {
  return Array.from(new Set((values || []).map((value) => toPlainText(value)).filter((value): value is string => Boolean(value))));
}

function parseDate(value: string | null | undefined): string | null {
  const normalized = cleanText(value);
  if (!normalized || normalized === 'Unknown') return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(status?: string | null): string | null {
  const normalized = toPlainText(status);
  if (!normalized) return null;
  if (normalized === 'RELEASING') return 'Currently Airing';
  if (normalized === 'FINISHED') return 'Finished Airing';
  if (normalized === 'NOT_YET_RELEASED') return 'Not yet aired';
  return normalized;
}

function mapMetaToJikan(meta: KenjitsuMetaAnime, requestedId?: AnimeInputId): JikanAnime {
  const anilistId = meta.anilistId ?? undefined;
  const requestedNumeric = requestedId != null && /^\d+$/.test(String(requestedId)) ? Number(requestedId) : undefined;
  const publicId = requestedNumeric ?? anilistId ?? meta.malId ?? 0;
  const romajiTitle = cleanText(meta.title?.romaji);
  const englishTitle = cleanText(meta.title?.english);
  const nativeTitle = cleanText(meta.title?.native);
  const title = englishTitle || romajiTitle || nativeTitle || 'Sem titulo';
  const originalTitle = nativeTitle || romajiTitle || null;
  const poster = meta.image || '';
  const releaseDate = parseDate(meta.releaseDate);
  const status = normalizeStatus(meta.status);
  const format = cleanText(meta.format) || null;
  const releaseDateLabel = cleanText(meta.releaseDate);
  const studio = cleanText(meta.studio);
  const producers = cleanTextList(meta.producers);
  const genres = cleanTextList(meta.genres);

  return {
    mal_id: publicId,
    url: `/anime/${encodeURIComponent(String(publicId))}`,
    images: {
      jpg: { image_url: poster, small_image_url: poster, large_image_url: poster },
      webp: { image_url: poster, small_image_url: poster, large_image_url: poster },
    },
    trailer: {
      youtube_id: null,
      url: meta.trailer || null,
      embed_url: meta.trailer || null,
      images: {
        image_url: null,
        small_image_url: null,
        medium_image_url: null,
        large_image_url: null,
        maximum_image_url: null,
      },
    },
    approved: true,
    titles: [
      { type: 'Romaji', title: romajiTitle || title },
      { type: 'English', title },
      ...(originalTitle ? [{ type: 'Native', title: originalTitle }] : []),
    ],
    title,
    title_english: englishTitle || title,
    title_japanese: originalTitle,
    title_synonyms: cleanTextList(meta.synonyms),
    type: format,
    source: null,
    episodes: meta.episodes ?? null,
    status,
    airing: status === 'Currently Airing',
    aired: { from: releaseDate, to: parseDate(meta.endDate), string: releaseDateLabel },
    duration: meta.duration ? `${meta.duration} min per ep` : null,
    rating: null,
    score: meta.score != null ? meta.score / 10 : null,
    scored_by: null,
    rank: null,
    popularity: null,
    members: null,
    favorites: null,
    synopsis: toPlainText(meta.synopsis),
    background: null,
    season: cleanText(meta.season).toLowerCase() || null,
    year: meta.year ?? null,
    broadcast: { day: null, time: null, timezone: null, string: null },
    producers: producers.map((name, index) => ({ mal_id: index + 1, type: 'anime', name, url: '' })),
    licensors: [],
    studios: studio ? [{ mal_id: 1, type: 'anime', name: studio, url: '' }] : [],
    genres: genres.map((name, index) => ({ mal_id: index + 1, type: 'anime', name, url: '' })),
    explicit_genres: [],
    themes: [],
    demographics: [],
    bannerImage: meta.bannerImage || null,
    kenjitsu: { anilistId: anilistId ?? null, malId: meta.malId ?? null },
  };
}

function mapSearchItem(meta: KenjitsuMetaAnime): LocalAnimeSearchItem {
  const publicId = meta.anilistId ?? meta.malId;
  if (publicId == null) throw new Error('O Kenjitsu retornou um anime sem identificador');
  return {
    malId: publicId,
    anilistId: meta.anilistId ?? null,
    title: cleanText(meta.title?.english) || cleanText(meta.title?.romaji) || cleanText(meta.title?.native) || 'Sem titulo',
    originalTitle: cleanText(meta.title?.native) || cleanText(meta.title?.romaji) || null,
    posterUrl: meta.image || null,
    year: meta.year ?? null,
    rating: meta.score != null ? meta.score / 10 : null,
    status: normalizeStatus(meta.status),
    episodeCount: meta.episodes ?? 0,
  };
}

function responsePagination(payload: {
  hasNextPage?: boolean;
  currentPage?: number;
  lastPage?: number;
  total?: number;
  perPage?: number;
}) {
  const currentPage = payload.currentPage || 1;
  const totalPages = payload.lastPage || (payload.hasNextPage ? currentPage + 1 : currentPage);
  return {
    currentPage,
    totalPages,
    totalItems: payload.total || totalPages * (payload.perPage || 24),
    hasNextPage: Boolean(payload.hasNextPage),
    hasPreviousPage: currentPage > 1,
  };
}

export interface KenjitsuCatalogFilters {
  status?: 'airing' | 'complete' | 'upcoming' | 'all';
  minScore?: number;
  type?: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'all';
  orderBy?: 'score' | 'popularity' | 'title' | 'start_date';
  sort?: 'asc' | 'desc';
  letter?: string;
  genres?: string;
  audioLanguage?: 'all' | 'subbed_pt' | 'dubbed_pt' | 'pt_br';
}

const KENJITSU_GENRE_NAMES: Record<string, string> = {
  '1': 'Action',
  '2': 'Adventure',
  '4': 'Comedy',
  '8': 'Drama',
  '10': 'Fantasy',
  '22': 'Romance',
  '24': 'Sci-Fi',
  '36': 'Slice of Life',
  '37': 'Supernatural',
  '41': 'Thriller',
  '62': 'Isekai',
};

function matchesFilters(meta: KenjitsuMetaAnime, filters?: KenjitsuCatalogFilters): boolean {
  if (!filters) return true;
  const status = meta.status?.toUpperCase();
  if (filters.status === 'airing' && status !== 'RELEASING') return false;
  if (filters.status === 'complete' && status !== 'FINISHED') return false;
  if (filters.status === 'upcoming' && status !== 'NOT_YET_RELEASED') return false;
  if (filters.minScore && (meta.score == null || meta.score < filters.minScore * 10)) return false;
  if (filters.type && filters.type !== 'all' && meta.format?.toLowerCase() !== filters.type) return false;

  const title = meta.title?.english || meta.title?.romaji || meta.title?.native || '';
  if (filters.letter && filters.letter !== 'all') {
    const first = title.trim().charAt(0).toLowerCase();
    if (filters.letter === '#') {
      if (!first || /[a-z]/.test(first)) return false;
    } else if (first !== filters.letter.toLowerCase()) {
      return false;
    }
  }

  if (filters.genres) {
    const requested = filters.genres
      .split(',')
      .map((value) => KENJITSU_GENRE_NAMES[value.trim()] || value.trim().toLowerCase());
    const available = (meta.genres || []).map((genre) => genre.toLowerCase());
    if (!requested.some((genre) => available.includes(genre.toLowerCase()))) return false;
  }

  return true;
}

function sortCatalog(items: KenjitsuMetaAnime[], filters?: KenjitsuCatalogFilters): KenjitsuMetaAnime[] {
  if (!filters?.orderBy) return items;
  const direction = filters.sort === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (filters.orderBy === 'title') {
      const aTitle = a.title?.english || a.title?.romaji || a.title?.native || '';
      const bTitle = b.title?.english || b.title?.romaji || b.title?.native || '';
      return aTitle.localeCompare(bTitle) * direction;
    }
    if (filters.orderBy === 'start_date') return ((a.year || 0) - (b.year || 0)) * direction;
    return ((a.score || 0) - (b.score || 0)) * direction;
  });
}

const MAPPED_KENJITSU_EXTENSION_IDS = [
  'anizone',
  'anikoto',
  'anidb',
  'anibd',
  'animeheaven',
] as const satisfies readonly KenjitsuExtensionId[];

const normalizeExtensionTitle = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const comparableExtensionTitle = (value: string): string =>
  normalizeExtensionTitle(value)
    .replace(/\b(?:dublado|legendado|dual audio|todos os episodios|assistir online|online|hd|hdtv|full hd)\b/g, ' ')
    .replace(/\b(?:classico|original)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const usableExtensionSearchItem = (item: KenjitsuExtensionSearchItem): boolean => {
  const id = String(item.id ?? '').trim();
  return Boolean(id && id !== '/' && id !== '#');
};

function selectExtensionSearchItem(items: KenjitsuExtensionSearchItem[], titles: string[]): KenjitsuExtensionSearchItem | null {
  const usable = items.filter(usableExtensionSearchItem);
  if (!usable.length) return null;

  const normalizedTitles = titles.map(comparableExtensionTitle).filter(Boolean);
  const exact = usable.find((item) => {
    const names = [item.name, item.romaji].filter((value): value is string => Boolean(value)).map(comparableExtensionTitle);
    return names.some((name) => normalizedTitles.includes(name));
  });
  if (exact) return exact;

  // A fuzzy prefix match can silently turn Naruto into Naruto Shippuden or
  // Boruto. Returning no match is safer than attaching another anime's
  // episodes and playback sources to the requested catalog item.
  return null;
}

function extensionSearchTitles(metadata: KenjitsuMetaAnime, preferredTitles: readonly string[]): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const value of [
    ...preferredTitles,
    metadata.title?.english,
    metadata.title?.romaji,
    metadata.title?.native,
    ...(metadata.synonyms || []),
  ]) {
    if (!value?.trim()) continue;
    const key = normalizeExtensionTitle(value);
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(value.trim());
    // One romanized title and one native title are enough to cover the
    // supported sources without burning the Kenjitsu request budget on every
    // synonym when an upstream is unavailable.
    if (titles.length >= 2) break;
  }
  return titles;
}

export async function resolveKenjitsuExtensionInfo(
  anilistId: number,
  extensionId: KenjitsuExtensionId,
  preferredTitles: readonly string[] = [],
  metadataInput?: KenjitsuMetaAnime | null,
): Promise<{ info: Awaited<ReturnType<typeof kenjitsuClient.getExtensionInfo>>; providerId: string | number } | null> {
  const metadata = metadataInput ?? (await kenjitsuClient.getMetadata(anilistId)).data;
  if (!metadata) return null;

  let providerId: string | number | null = null;
  if ((MAPPED_KENJITSU_EXTENSION_IDS as readonly string[]).includes(extensionId)) {
    try {
      const mapping = await kenjitsuClient.getMapping(anilistId, extensionId);
      providerId = mapping.data?.provider?.id ?? mapping.provider?.id ?? null;
    } catch {
      // Ported and newer providers can still resolve through their own search endpoint.
    }
  }

  if (providerId == null) {
    const titles = extensionSearchTitles(metadata, preferredTitles);
    for (const title of titles) {
      try {
        const search = await kenjitsuClient.searchExtension(extensionId, title, 1);
        const match = selectExtensionSearchItem(search.data || [], titles);
        if (match?.id != null) {
          providerId = match.id;
          break;
        }
      } catch {
        // A single dead upstream must not prevent other Kenjitsu extensions from resolving.
      }
    }
  }

  if (providerId == null) return null;
  const info = await kenjitsuClient.getExtensionInfo(extensionId, providerId);
  return { info, providerId };
}

async function resolveAnilistId(input: AnimeInputId): Promise<number> {
  const value = String(input);
  if (value.startsWith('anilist:')) {
    const id = Number(value.slice('anilist:'.length));
    if (Number.isSafeInteger(id) && id > 0) return id;
  }

  if (/^\d+$/.test(value)) {
    try {
      const direct = await kenjitsuClient.getMetadata(Number(value));
      if (direct.data?.anilistId) return Number(direct.data.anilistId);
    } catch {
      // A numeric input may still be a legacy catalog identifier; resolve it through Kenjitsu.
    }

    const candidates = await kenjitsuClient.searchMetadata(value, 1, 50);
    const exactMal = candidates.data?.find((item) => Number(item.malId) === Number(value));
    if (exactMal?.anilistId) return Number(exactMal.anilistId);
    const exactAnilist = candidates.data?.find((item) => Number(item.anilistId) === Number(value));
    if (exactAnilist?.anilistId) return Number(exactAnilist.anilistId);
  }

  const localAnime = await prisma.anime.findFirst({
    where: {
      OR: [{ id: value }, { slug: value }, { identifiers: { some: { value } } }],
    },
    include: { identifiers: true },
  }).catch(() => null);

  const localAnilistId = localAnime?.identifiers.find(
    (identifier: { provider: string; value: string }) => ['anilist', 'kenjitsu'].includes(identifier.provider.toLowerCase()) && /^\d+$/.test(identifier.value),
  );
  if (localAnilistId) return Number(localAnilistId.value);

  const legacyId = localAnime?.identifiers.find((identifier: { provider: string; value: string }) => /^\d+$/.test(identifier.value));
  if (legacyId) {
    const candidates = await kenjitsuClient.searchMetadata(legacyId.value, 1, 50);
    const match = candidates.data?.find(
      (item) => Number(item.malId) === Number(legacyId.value) || Number(item.anilistId) === Number(legacyId.value),
    );
    if (match?.anilistId) return Number(match.anilistId);
  }

  throw new KenjitsuRequestError('Anime nao encontrado no catalogo do Kenjitsu', 404);
}

export async function searchAnimeCatalog(
  query: string,
  page = 1,
  limit = 24,
  filters?: KenjitsuCatalogFilters,
): Promise<LocalAnimeSearchResponse> {
  const payload = query.trim()
    ? await kenjitsuClient.searchMetadata(query.trim(), page, Math.min(50, Math.max(limit, 24)))
    : await kenjitsuClient.getTop('popular', page, limit);
  const enriched = await enrichMissingScores(payload.data || []);
  const filtered = sortCatalog(enriched.filter((item) => matchesFilters(item, filters)), filters);
  const items = filtered.slice(0, limit).map(mapSearchItem);
  return {
    data: items,
    pagination: responsePagination({ ...payload, perPage: limit, total: filtered.length }),
  };
}

export async function getAnimeCatalog(input: AnimeInputId): Promise<JikanAnime> {
  const anilistId = await resolveAnilistId(input);
  const payload = await kenjitsuClient.getMetadata(anilistId);
  if (!payload.data) throw new KenjitsuRequestError('Detalhes nao retornados pelo Kenjitsu', 502, payload);
  return mapMetaToJikan(payload.data, input);
}

export async function getAnimeCharacters(input: AnimeInputId): Promise<JikanCharacter[]> {
  const anilistId = await resolveAnilistId(input);
  const payload = await kenjitsuClient.getCharacters(anilistId);
  const raw = payload.data as { characters?: Array<Record<string, unknown>> } | null;
  return (raw?.characters || []).map((character, index) => ({
    character: {
      mal_id: Number(character.id || index + 1),
      url: '',
      images: {
        jpg: { image_url: String(character.image || ''), small_image_url: String(character.image || ''), large_image_url: String(character.image || '') },
      },
      name: cleanUnknownText(character.name, 'Personagem'),
    },
    role: cleanUnknownText(character.role, 'Supporting'),
    voice_actors: Array.isArray(character.voiceActors)
      ? character.voiceActors.map((actor) => {
          const actorRecord = actor as Record<string, unknown>;
          return {
            person: {
              mal_id: 0,
              url: '',
              images: { jpg: { image_url: String(actorRecord.image || ''), small_image_url: String(actorRecord.image || ''), large_image_url: String(actorRecord.image || '') } },
              name: cleanUnknownText(actorRecord.name),
            },
            language: cleanUnknownText(actorRecord.language),
          };
        })
      : [],
  }));
}

export async function getAnimeRelations(input: AnimeInputId): Promise<JikanRelation[]> {
  const anilistId = await resolveAnilistId(input);
  const payload = await kenjitsuClient.getRelated(anilistId);
  const raw = Array.isArray(payload.data) ? payload.data : [];
  const grouped = new Map<string, JikanRelation['entry']>();
  raw.forEach((item, index) => {
    const record = item as Record<string, unknown>;
    const relation = cleanUnknownText(record.relationType, 'Related');
    const relationTitle = record.title as Record<string, unknown> | undefined;
    const entry = {
      mal_id: Number(record.malId || record.anilistId || index + 1),
      type: cleanUnknownText(record.type, 'anime'),
      name: cleanUnknownText(relationTitle?.english) || cleanUnknownText(relationTitle?.romaji) || 'Anime relacionado',
      url: '',
    };
    grouped.set(relation, [...(grouped.get(relation) || []), entry]);
  });
  return Array.from(grouped, ([relation, entry]) => ({ relation, entry }));
}

export async function getAnimeEpisodes(input: AnimeInputId): Promise<JikanEpisode[]> {
  const anilistId = await resolveAnilistId(input);
  const extensionIds = await getEnabledKenjitsuExtensions();
  const metadata = await kenjitsuClient.getMetadata(anilistId);
  const mappings = await mapWithConcurrency(
    extensionIds,
    async (extensionId) => {
      const resolved = await resolveKenjitsuExtensionInfo(anilistId, extensionId, [], metadata.data);
      if (!resolved) return [] as JikanEpisode[];
      const providerEpisodes = resolved.info.providerEpisodes || resolved.info.data?.providerEpisodes || [];
      return providerEpisodes.flatMap((episode) => {
        if (episode.episodeNumber == null) return [];
        return [{ mal_id: Number(episode.episodeNumber), title: cleanText(episode.title, `Episodio ${episode.episodeNumber}`), aired: null, url: episode.episodeId || null }];
      });
    },
    { concurrency: 4 },
  );

  const episodes = new Map<number, JikanEpisode>();
  mappings.forEach((result) => {
    result?.forEach((episode) => {
      const current = episodes.get(episode.mal_id);
      if (!current || (current.title?.startsWith('Episodio ') && !episode.title?.startsWith('Episodio '))) episodes.set(episode.mal_id, episode);
    });
  });
  return Array.from(episodes.values()).sort((a, b) => a.mal_id - b.mal_id);
}

export async function getTopAnime(category: 'popular' | 'airing' | 'upcoming' | 'rating' | 'trending', page = 1, limit = 24) {
  const payload = await kenjitsuClient.getTop(category, page, limit);
  const sourceItems = await enrichMissingScores(payload.data || []);

  return {
    data: sourceItems.map((item) => mapMetaToJikan(item)),
    pagination: { current_page: payload.currentPage || page, has_next_page: Boolean(payload.hasNextPage), items: { total: payload.total || 0, per_page: limit } },
  };
}

async function enrichMissingScores(items: KenjitsuMetaAnime[]): Promise<KenjitsuMetaAnime[]> {
  const missing = items.filter((item) => item.score == null && item.anilistId != null);
  if (!missing.length) return items;

  const details = await mapWithConcurrency(
    missing,
    async (item) => {
      try {
        const detail = await kenjitsuClient.getMetadata(Number(item.anilistId));
        const score = detail.data?.score;
        return score == null ? null : { anilistId: Number(item.anilistId), score };
      } catch {
        return null;
      }
    },
    { concurrency: 4 },
  );
  const scoreByAnilistId = new Map(
    details.filter((detail): detail is { anilistId: number; score: number } => Boolean(detail)).map((detail) => [detail.anilistId, detail.score]),
  );
  return items.map((item) => {
    const score = item.anilistId != null ? scoreByAnilistId.get(Number(item.anilistId)) : undefined;
    return score == null ? item : { ...item, score };
  });
}

export async function getSeasonAnime(year: number, season: 'winter' | 'spring' | 'summer' | 'fall', page = 1, limit = 24) {
  const payload = await kenjitsuClient.getSeason(season.toUpperCase() as 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL', year, page, limit);
  return {
    data: (await enrichMissingScores(payload.data || [])).map((item) => mapMetaToJikan(item)),
    pagination: { current_page: payload.currentPage || page, has_next_page: Boolean(payload.hasNextPage), items: { total: payload.total || 0, per_page: limit } },
  };
}

export { mapMetaToJikan, resolveAnilistId };
