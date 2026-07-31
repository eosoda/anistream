import type { LocalAnimeSearchResponse } from '@/types/local-search';

export async function searchAvailableAnime(query: string, page = 1, limit = 24, signal?: AbortSignal): Promise<LocalAnimeSearchResponse> {
  const params = new URLSearchParams({ q: query.trim(), page: String(page), limit: String(limit) });
  const response = await fetch(`/api/anime/search?${params}`, { signal });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || 'Não foi possível buscar os animes disponíveis.');
  return payload as LocalAnimeSearchResponse;
}
