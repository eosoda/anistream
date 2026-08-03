export const KENJITSU_EXTENSION_IDS = [
  'anizone',
  'anikoto',
  'anidb',
  'anibd',
  'animeheaven',
  'anikyuu',
  'animefire',
  'animeito',
  'animeplay',
  'animeplayer',
  'animeq',
  'animesbr',
  'animescx',
  'animesdigital',
  'animesdrive',
  'animesgratis',
  'animesonlinecc',
  'animesonlinecloud',
  'animesonlinevip',
  'animesroll',
  'anitube',
  'betteranimeio',
  'dattebayobr',
  'donghuanosekai',
  'goyabu',
  'muitohentai',
  'pifansubs',
  'smartanimes',
  'sushianimes',
  'tomato',
] as const;

export type KenjitsuExtensionId = (typeof KENJITSU_EXTENSION_IDS)[number];

export const KENJITSU_NSFW_EXTENSION_IDS = ['muitohentai'] as const;

export interface KenjitsuResponse<T> {
  data: T;
  error?: string;
  status?: number;
  [key: string]: unknown;
}

export interface KenjitsuMetaAnime {
  malId?: number | null;
  anilistId?: number | null;
  image?: string | null;
  bannerImage?: string | null;
  color?: string | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  trailer?: string | null;
  format?: string | null;
  status?: string | null;
  synonyms?: string[] | null;
  year?: number | null;
  duration?: number | null;
  score?: number | null;
  genres?: string[] | null;
  episodes?: number | null;
  synopsis?: string | null;
  season?: string | null;
  releaseDate?: string | null;
  endDate?: string | null;
  studio?: string | null;
  producers?: string[] | null;
}

export interface KenjitsuProviderId {
  id: string | number | null;
  name?: string | null;
  native?: string | null;
  romaji?: string | null;
  provider?: KenjitsuExtensionId | string | null;
  score?: number | null;
}

export interface KenjitsuProviderEpisode {
  episodeId: string | null;
  episodeNumber: number | null;
  title?: string | null;
  overview?: string | null;
  thumbnail?: string | null;
  hasSub?: boolean;
  hasDub?: boolean;
  provider?: string | null;
  [key: string]: unknown;
}

export interface KenjitsuExtensionSearchItem {
  id: string | number | null;
  name?: string | null;
  romaji?: string | null;
  posterImage?: string | null;
  image?: string | null;
  [key: string]: unknown;
}

export interface KenjitsuExtensionInfo {
  id?: string | number | null;
  name?: string | null;
  romaji?: string | null;
  posterImage?: string | null;
  coverImage?: string | null;
  synopsis?: string | null;
  type?: string | null;
  status?: string | null;
  releaseDate?: string | number | null;
  totalEpisodes?: number | null;
  episodes?: { sub?: number | null; dub?: number | null } | null;
  providerEpisodes?: KenjitsuProviderEpisode[];
  [key: string]: unknown;
}

export interface KenjitsuVideoSource {
  url?: string | null;
  isM3u8?: boolean | null;
  type?: string | null;
  quality?: string | null;
}

export interface KenjitsuVideoData {
  sources?: KenjitsuVideoSource[];
  subtitles?: Array<{
    url?: string | null;
    lang?: string | null;
    label?: string | null;
    default?: boolean | null;
  }>;
  tracks?: Array<{ url?: string | null; type?: string | null; quality?: string | null }>;
  intro?: { start?: number | null; end?: number | null };
  outro?: { start?: number | null; end?: number | null };
  [key: string]: unknown;
}

export interface KenjitsuExtensionHealth {
  id: string;
  name: string;
  source: string;
  version: string;
  isNsfw: boolean;
  capabilities: string[];
}
