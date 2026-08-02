import type { JikanAnime, JikanCharacter, JikanEpisode, JikanRelation } from '@/types/anime';
import type { LocalAnimeSearchItem, LocalAnimeSearchResponse } from '@/types/local-search';
import { kenjitsuClient, KenjitsuRequestError } from './client';
import { KENJITSU_EXTENSION_IDS, type KenjitsuExtensionId, type KenjitsuMetaAnime } from './types';

type AnimeInputId = string | number;

function parseDate(value: string | null | undefined): string | null {
  if (!value || value === 'Unknown') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(status?: string | null): string | null {
  if (!status) return null;
  if (status === 'RELEASING') return 'Currently Airing';
  if (status === 'FINISHED') return 'Finished Airing';
  if (status === 'NOT_YET_RELEASED') return 'Not yet aired';
  return status;
}

function mapMetaToJikan(meta: KenjitsuMetaAnime, requestedId?: AnimeInputId): JikanAnime {
  const anilistId = meta.anilistId ?? undefined;
  const requestedNumeric = requestedId != null && /^\d+$/.test(String(requestedId)) ? Number(requestedId) : undefined;
  const publicId = requestedNumeric ?? anilistId ?? meta.malId ?? 0;
  const title = meta.title?.english || meta.title?.romaji || meta.title?.native || 'Sem título';
  const originalTitle = meta.title?.native || meta.title?.romaji || null;
  const poster = meta.image || '';
  const releaseDate = parseDate(meta.releaseDate);
  const status = normalizeStatus(meta.status);

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
      { type: 'Romaji', title: meta.title?.romaji || title },
      { type: 'English', title },
      ...(originalTitle ? [{ type: 'Native', title: originalTitle }] : []),
    ],
    title,
    title_english: meta.title?.english || title,
    title_japanese: originalTitle,
    title_synonyms: meta.synonyms || [],
    type: meta.format || null,
    source: null,
    episodes: meta.episodes ?? null,
    status,
    airing: status === 'Currently Airing',
    aired: { from: releaseDate, to: parseDate(meta.endDate), string: meta.releaseDate || '' },
    duration: meta.duration ? `${meta.duration} min per ep` : null,
    rating: null,
    score: meta.score ?? null,
    scored_by: null,
    rank: null,
    popularity: null,
    members: null,
    favorites: null,
    synopsis: meta.synopsis || null,
    background: null,
    season: meta.season?.toLowerCase() || null,
    year: meta.year ?? null,
    broadcast: { day: null, time: null, timezone: null, string: null },
    producers: (meta.producers || []).map((name, index) => ({ mal_id: index + 1, type: 'anime', name, url: '' })),
    licensors: [],
    studios: meta.studio ? [{ mal_id: 1, type: 'anime', name: meta.studio, url: '' }] : [],
    genres: (meta.genres || []).map((name, index) => ({ mal_id: index + 1, type: 'anime', name, url: '' })),
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
    title: meta.title?.english || meta.title?.romaji || meta.title?.native || 'Sem título',
    originalTitle: meta.title?.native || meta.title?.romaji || null,
    posterUrl: meta.image || null,
    year: meta.year ?? null,
    rating: meta.score ?? null,
    status: normalizeStatus(meta.status),
    episodeCount: meta.episodes ?? 0,
  };
}

function responsePagination(payload: { hasNextPage?: boolean; currentPage?: number; lastPage?: number; total?: number; perPage?: number }) {
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

async function resolveAnilistId(input: AnimeInputId): Promise<number> {
  const value = String(input);
  if (value.startsWith('anilist:')) {
    const id = Number(value.slice('anilist:'.length));
    if (Number.isSafeInteger(id) && id > 0) return id;
  }

  if (/^\d+$/.test(value)) {
    const candidates = await kenjitsuClient.searchMetadata(value, 1, 50);
    const exactMal = candidates.data?.find((item) => Number(item.malId) === Number(value));
    if (exactMal?.anilistId) return Number(exactMal.anilistId);
    const exactAnilist = candidates.data?.find((item) => Number(item.anilistId) === Number(value));
    if (exactAnilist?.anilistId) return Number(exactAnilist.anilistId);
  }

  throw new KenjitsuRequestError('Anime não encontrado no catálogo do Kenjitsu', 404);
}

export async function searchAnimeCatalog(query: string, page = 1, limit = 24): Promise<LocalAnimeSearchResponse> {
  const payload = query.trim()
    ? await kenjitsuClient.searchMetadata(query.trim(), page, limit)
    : await kenjitsuClient.getTop('popular', page, limit);
  const items = (payload.data || []).map(mapSearchItem);
  return { data: items, pagination: responsePagination(payload as unknown as { hasNextPage?: boolean; currentPage?: number; lastPage?: number; total?: number; perPage?: number }) };
}

export async function getAnimeCatalog(input: AnimeInputId): Promise<JikanAnime> {
  const anilistId = await resolveAnilistId(input);
  const payload = await kenjitsuClient.getMetadata(anilistId);
  if (!payload.data) throw new KenjitsuRequestError('Detalhes não retornados pelo Kenjitsu', 502, payload);
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
      name: String(character.name || 'Personagem'),
    },
    role: String(character.role || 'Supporting'),
    voice_actors: Array.isArray(character.voiceActors)
      ? character.voiceActors.map((actor) => ({
          person: {
            mal_id: 0,
            url: '',
            images: { jpg: { image_url: String(actor.image || ''), small_image_url: String(actor.image || ''), large_image_url: String(actor.image || '') } },
            name: String(actor.name || ''),
          },
          language: String(actor.language || ''),
        }))
      : [],
  }));
}

export async function getAnimeRelations(input: AnimeInputId): Promise<JikanRelation[]> {
  const anilistId = await resolveAnilistId(input);
  const payload = await kenjitsuClient.getRelated(anilistId);
  const raw = Array.isArray(payload.data) ? payload.data : [];
  const grouped = new Map<string, JikanRelation['entry']>();
  raw.forEach((item, index) => {
    const relation = String((item as { relationType?: unknown }).relationType || 'Related');
    const entry = {
      mal_id: Number((item as { malId?: unknown }).malId || (item as { anilistId?: unknown }).anilistId || index + 1),
      type: String((item as { type?: unknown }).type || 'anime'),
      name: String((item as { title?: { english?: string; romaji?: string } }).title?.english || (item as { title?: { romaji?: string } }).title?.romaji || 'Anime relacionado'),
      url: '',
    };
    grouped.set(relation, [...(grouped.get(relation) || []), entry]);
  });
  return Array.from(grouped, ([relation, entry]) => ({ relation, entry }));
}

export async function getAnimeEpisodes(input: AnimeInputId): Promise<JikanEpisode[]> {
  const anilistId = await resolveAnilistId(input);
  const mappings = await Promise.allSettled(
    KENJITSU_EXTENSION_IDS.map(async (extensionId) => {
      const mapping = await kenjitsuClient.getMapping(anilistId, extensionId);
      if (!mapping.provider?.id) return [] as JikanEpisode[];
      const info = await kenjitsuClient.getExtensionInfo(extensionId, mapping.provider.id);
      const providerEpisodes = info.providerEpisodes || info.data?.providerEpisodes || [];
      return providerEpisodes.flatMap((episode) => {
        if (episode.episodeNumber == null) return [];
        return [{
          mal_id: Number(episode.episodeNumber),
          title: episode.title || `Episódio ${episode.episodeNumber}`,
          aired: null,
          url: episode.episodeId || null,
        }];
      });
    }),
  );

  const episodes = new Map<number, JikanEpisode>();
  mappings.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((episode) => {
      const current = episodes.get(episode.mal_id);
      if (!current || (current.title?.startsWith('Episódio ') && !episode.title?.startsWith('Episódio '))) {
        episodes.set(episode.mal_id, episode);
      }
    });
  });
  return Array.from(episodes.values()).sort((a, b) => a.mal_id - b.mal_id);
}

export async function getTopAnime(category: 'popular' | 'airing' | 'upcoming' | 'rating' | 'trending', page = 1, limit = 24) {
  const payload = await kenjitsuClient.getTop(category, page, limit);
  return {
    data: (payload.data || []).map((item) => mapMetaToJikan(item)),
    pagination: { current_page: payload.currentPage || page, has_next_page: Boolean(payload.hasNextPage), items: { total: payload.total || 0, per_page: limit } },
  };
}

export async function getSeasonAnime(year: number, season: 'winter' | 'spring' | 'summer' | 'fall', page = 1, limit = 24) {
  const payload = await kenjitsuClient.getSeason(season.toUpperCase() as 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL', year, page, limit);
  return {
    data: (payload.data || []).map((item) => mapMetaToJikan(item)),
    pagination: { current_page: payload.currentPage || page, has_next_page: Boolean(payload.hasNextPage), items: { total: payload.total || 0, per_page: limit } },
  };
}

export { mapMetaToJikan, resolveAnilistId };
