/**
 * Compatibility export for screens that have not yet been renamed.
 * The implementation is server-backed and talks only to the AniStream
 * Kenjitsu facade; it does not call Jikan or any other metadata API.
 */
export { kenjitsuService as jikanService, kenjitsuService } from './kenjitsu';
export type { SearchAnimeFilters } from './kenjitsu';
