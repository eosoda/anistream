export type AudioLanguage =
  | 'ja'
  | 'pt-BR'
  | 'en'
  | 'es'
  | 'unknown';

export type StreamType = 'hls' | 'mp4' | 'dash';

export type SubtitleFormat = 'vtt' | 'srt' | 'ass';

export interface SubtitleTrackData {
  language: string;
  label: string;
  url: string;
  format: SubtitleFormat;
}

export interface AnimeSearchInput {
  query: string;
  language?: AudioLanguage;
  limit?: number;
}

export interface AnimeSearchResult {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string | null;
  posterUrl?: string | null;
  releaseYear?: number | null;
  status?: string | null;
}

export interface EpisodeLookupInput {
  animeId: string;
  season: number;
  episode: number;
  preferredAudio?: AudioLanguage;
}

export interface Episode {
  id: string;
  animeId: string;
  season: number;
  number: number;
  title?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  airedAt?: Date | string | null;
}

export interface StreamSource {
  id: string;
  provider: string;
  url: string;
  type: StreamType;
  quality?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  audioLanguage?: AudioLanguage;
  subtitles?: SubtitleTrackData[];
  requiresProxy?: boolean;
  headers?: Record<string, string>;
  expiresAt?: string;
  priority?: number;
}

export interface ProviderAttempt {
  provider: string;
  success: boolean;
  durationMs: number;
  sourceCount: number;
  error?: string;
}

export interface ResolveStreamResult {
  selected: StreamSource | null;
  alternatives: StreamSource[];
  attempts: ProviderAttempt[];
}

export interface ProviderHealth {
  providerId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastChecked: string;
  errorMessage?: string;
}
