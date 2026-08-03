export interface JikanImage {
  jpg: {
    image_url: string;
    small_image_url: string;
    large_image_url: string;
  };
  webp?: {
    image_url: string;
    small_image_url: string;
    large_image_url: string;
  };
}

export interface JikanTrailer {
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
  images: {
    image_url: string | null;
    small_image_url: string | null;
    medium_image_url: string | null;
    large_image_url: string | null;
    maximum_image_url: string | null;
  };
}

export interface JikanTitle {
  type: string;
  title: string;
}

export interface JikanGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
  count?: number;
}

export interface JikanEntity {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAnime {
  /** Kept as `mal_id` for UI compatibility; new catalog records use AniList IDs. */
  mal_id: number;
  url: string;
  images: JikanImage;
  trailer: JikanTrailer;
  approved: boolean;
  titles: JikanTitle[];
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms: string[];
  type: string | null; // "TV", "Movie", "OVA", "ONA", "Special", etc.
  source: string | null; // "Manga", "Light novel", "Original", etc.
  episodes: number | null;
  status: string | null; // "Finished Airing", "Currently Airing", "Not yet aired"
  airing: boolean;
  aired: {
    from: string | null;
    to: string | null;
    string: string;
  };
  duration: string | null;
  rating: string | null; // "PG-13", "R - 17+", etc.
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  background: string | null;
  season: string | null; // "spring", "summer", "fall", "winter"
  year: number | null;
  broadcast?: {
    day: string | null;
    time: string | null;
    timezone: string | null;
    string: string | null;
  };
  producers: JikanEntity[];
  licensors: JikanEntity[];
  studios: JikanEntity[];
  genres: JikanGenre[];
  explicit_genres: JikanGenre[];
  themes: JikanGenre[];
  demographics: JikanGenre[];
  // Banner image provided by the Kenjitsu metadata response
  bannerImage?: string | null;
  kenjitsu?: { anilistId?: number | null; malId?: number | null };
}

export interface JikanEpisode {
  mal_id: number;
  url?: string | null;
  title: string;
  title_japanese?: string | null;
  title_romanji?: string | null;
  aired?: string | null;
  score?: number | null;
  filler?: boolean;
  recap?: boolean;
  forum_url?: string | null;
}

export interface JikanCharacter {
  character: {
    mal_id: number;
    url: string;
    images: JikanImage;
    name: string;
  };
  role: string; // "Main" or "Supporting"
  voice_actors: {
    person: {
      mal_id: number;
      url: string;
      images: JikanImage;
      name: string;
    };
    language: string;
  }[];
}

export interface JikanRelation {
  relation: string; // "Sequel", "Prequel", "Alternative version", "Spin-off", etc.
  entry: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
}

export interface AniListMedia {
  id: number;
  idMal: number;
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  bannerImage: string | null;
  coverImage: {
    extraLarge: string;
    large: string;
    medium: string;
    color: string | null;
  };
  description: string | null;
  episodes: number | null;
  status: string;
  meanScore: number | null;
  popularity: number | null;
  trending: number | null;
  genres: string[];
}

export type SeasonName = 'winter' | 'spring' | 'summer' | 'fall';

export interface SeasonOption {
  year: number;
  season: SeasonName;
  label: string;
}
