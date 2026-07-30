import { normalizeAnimeTitle } from './normalize-title';

export interface StandardAnimeMetadata {
  malId?: number;
  anilistId?: number;
  title: string;
  originalTitle?: string;
  normalizedTitle: string;
  slug: string;
  posterUrl?: string;
  bannerUrl?: string;
  releaseYear?: number;
  status?: string;
  description?: string;
  episodesCount?: number;
  rating?: number;
  genres?: string;
  aliases?: string[];
}

/**
 * Busca metadados de animes em múltiplas fontes (AniList GraphQL, Jikan, Kitsu)
 * com fallback automático em caso de erro 504 / 503 / 429 da API Jikan.
 */
export async function searchAnimeMetadata(query: string): Promise<StandardAnimeMetadata[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. Tentar AniList GraphQL (Alta velocidade, resposta em ~100ms sem rate limit 504)
  try {
    const anilistResults = await fetchFromAniList(trimmed);
    if (anilistResults && anilistResults.length > 0) {
      return anilistResults;
    }
  } catch (err) {
    // Fallback gracioso para Jikan
  }

  // 2. Tentar Jikan v4 com timeout curto de 4s
  try {
    const jikanResults = await fetchFromJikan(trimmed);
    if (jikanResults && jikanResults.length > 0) {
      return jikanResults;
    }
  } catch (err) {
    // Fallback para Kitsu
  }

  // 3. Tentar Kitsu API
  try {
    const kitsuResults = await fetchFromKitsu(trimmed);
    if (kitsuResults && kitsuResults.length > 0) {
      return kitsuResults;
    }
  } catch (err) {
    // Falha final
  }

  return [];
}

async function fetchFromAniList(query: string): Promise<StandardAnimeMetadata[]> {
  const graphqlQuery = `
    query ($search: String) {
      Page(perPage: 6) {
        media(search: $search, type: ANIME) {
          id
          idMal
          title {
            english
            romaji
            native
          }
          synonyms
          coverImage {
            extraLarge
            large
          }
          bannerImage
          startDate {
            year
          }
          status
          episodes
          description(asHtml: false)
          averageScore
          genres
        }
      }
    }
  `;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const mediaItems = json?.data?.Page?.media || [];

    return mediaItems.map((item: any) => {
      const mainTitle = item.title?.english || item.title?.romaji || item.title?.native || 'Anime Sem Título';
      const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '');

      const aliasList = Array.from(
        new Set(
          [
            item.title?.english,
            item.title?.romaji,
            item.title?.native,
            ...(item.synonyms || []),
          ].filter(Boolean)
        )
      );

      return {
        malId: item.idMal ? Number(item.idMal) : undefined,
        anilistId: item.id ? Number(item.id) : undefined,
        title: mainTitle,
        originalTitle: item.title?.native || item.title?.romaji,
        normalizedTitle: normalizeAnimeTitle(mainTitle),
        slug: mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${item.id}`,
        posterUrl: item.coverImage?.extraLarge || item.coverImage?.large,
        bannerUrl: item.bannerImage || item.coverImage?.extraLarge,
        releaseYear: item.startDate?.year || new Date().getFullYear(),
        status: item.status === 'RELEASING' ? 'Em Lançamento' : 'Concluído',
        description: cleanDesc || 'Sem sinopse.',
        episodesCount: item.episodes || 12,
        rating: item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : 8.0,
        genres: (item.genres || []).join(', '),
        aliases: aliasList,
      };
    });
  } catch (e) {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchFromJikan(query: string): Promise<StandardAnimeMetadata[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`, {
      headers: { 'User-Agent': 'AniStream-AdminAutofill/1.0' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.data || [];

    return items.map((item: any) => {
      const mainTitle = item.title_english || item.title || 'Anime Sem Título';
      const aliasList = Array.from(
        new Set(
          [
            item.title_english,
            item.title_japanese,
            item.title,
            ...(item.title_synonyms || []),
          ].filter(Boolean)
        )
      );

      return {
        malId: item.mal_id,
        title: mainTitle,
        originalTitle: item.title_japanese || item.title,
        normalizedTitle: normalizeAnimeTitle(mainTitle),
        slug: mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${item.mal_id}`,
        posterUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
        bannerUrl: item.images?.jpg?.large_image_url,
        releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : new Date().getFullYear()),
        status: item.status === 'Currently Airing' ? 'Em Lançamento' : 'Concluído',
        description: item.synopsis || 'Sem sinopse.',
        episodesCount: item.episodes || 12,
        rating: item.score || 8.0,
        genres: (item.genres || []).map((g: any) => g.name).join(', '),
        aliases: aliasList,
      };
    });
  } catch (e) {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchFromKitsu(query: string): Promise<StandardAnimeMetadata[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=5`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const items = json.data || [];

    return items.map((item: any) => {
      const attr = item.attributes || {};
      const mainTitle = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Anime Sem Título';
      const aliasList = Array.from(
        new Set(
          [
            attr.canonicalTitle,
            attr.titles?.en,
            attr.titles?.en_jp,
            attr.titles?.ja_jp,
            ...(attr.abbreviatedTitles || []),
          ].filter(Boolean)
        )
      );

      return {
        malId: Number(item.id),
        title: mainTitle,
        originalTitle: attr.titles?.ja_jp || mainTitle,
        normalizedTitle: normalizeAnimeTitle(mainTitle),
        slug: mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${item.id}`,
        posterUrl: attr.posterImage?.large || attr.posterImage?.original,
        bannerUrl: attr.coverImage?.large || attr.posterImage?.large,
        releaseYear: attr.startDate ? new Date(attr.startDate).getFullYear() : new Date().getFullYear(),
        status: attr.status === 'current' ? 'Em Lançamento' : 'Concluído',
        description: attr.synopsis || 'Sem sinopse.',
        episodesCount: attr.episodeCount || 12,
        rating: attr.averageRating ? Number((Number(attr.averageRating) / 10).toFixed(1)) : 8.0,
        aliases: aliasList,
      };
    });
  } catch (e) {
    clearTimeout(timeout);
    return [];
  }
}
