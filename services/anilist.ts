import axios from 'axios';
import { AniListMedia } from '@/types/anime';

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

const ANILIST_QUERY_BY_MAL_ID = `
query ($malId: Int) {
  Media (idMal: $malId, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    bannerImage
    coverImage {
      extraLarge
      large
      medium
      color
    }
    description
    episodes
    status
    meanScore
    popularity
    trending
    genres
  }
}
`;

const ANILIST_TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    media (type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      idMal
      title {
        romaji
        english
      }
      bannerImage
      coverImage {
        extraLarge
      }
      description
      meanScore
    }
  }
}
`;

export const anilistService = {
  // Fetch extra media details / banner image by MyAnimeList ID
  async getMediaByMalId(malId: number): Promise<AniListMedia | null> {
    try {
      const response = await axios.post(
        ANILIST_GRAPHQL_URL,
        {
          query: ANILIST_QUERY_BY_MAL_ID,
          variables: { malId },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      );
      return response.data?.data?.Media || null;
    } catch (error) {
      // Graceful fallback if AniList query fails
      return null;
    }
  },

  // Fetch trending media for high quality banners
  async getTrendingBanners(perPage = 10): Promise<AniListMedia[]> {
    try {
      const response = await axios.post(
        ANILIST_GRAPHQL_URL,
        {
          query: ANILIST_TRENDING_QUERY,
          variables: { page: 1, perPage },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      );
      return response.data?.data?.Page?.media || [];
    } catch (error) {
      return [];
    }
  },
};
