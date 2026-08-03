import type { LocalAnimeSearchResponse } from '@/types/local-search';

export interface LocalAnimeSearchFilters {
  status?: 'airing' | 'complete' | 'upcoming' | 'all';
  minScore?: number;
  type?: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'all';
  orderBy?: 'score' | 'popularity' | 'title' | 'start_date';
  sort?: 'asc' | 'desc';
  letter?: string;
  genres?: string;
  audioLanguage?: 'all' | 'subbed_pt' | 'dubbed_pt' | 'pt_br';
}

export async function searchAvailableAnime(
  query: string,
  page = 1,
  limit = 24,
  signal?: AbortSignal,
  filters?: LocalAnimeSearchFilters,
): Promise<LocalAnimeSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), page: String(page), limit: String(limit) });
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') params.set(key, String(value));
  });
  const response = await fetch(`/api/anime/search?${params}`, { signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || 'Não foi possível buscar os animes disponíveis.');
  return payload as LocalAnimeSearchResponse;
}
