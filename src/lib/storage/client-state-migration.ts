'use client';

const MIGRATION_KEY = 'anistream_client_state_migration_v2';
const FAVORITES_KEY = 'anistream_favorites_v2';
const NEW_EPISODES_KEY = 'anistream_new_episodes_map_v2';
const SEEN_EPISODES_KEY = 'anistream_seen_episodes_v2';
const LAST_CHECK_KEY = 'anistream_last_check_time_v2';
const WATCH_PROGRESS_KEY = 'anistream_watch_progress_v2';
const PLAYBACK_PROGRESS_KEY = 'anistream_playback_progress_v2';

type LegacyAnime = {
  mal_id?: number;
  title?: string;
  kenjitsu?: { anilistId?: number | null };
  [key: string]: unknown;
};

function readFirst<T>(keys: string[], fallback: T): T {
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (!value) continue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function canonicalId(anime: LegacyAnime): number | null {
  const id = anime.kenjitsu?.anilistId ?? anime.mal_id;
  return typeof id === 'number' && Number.isFinite(id) && id > 0 ? id : null;
}

function remapRecord<T>(record: Record<string, T>, idMap: Map<number, number>): Record<string, T> {
  return Object.entries(record).reduce<Record<string, T>>((result, [key, value]) => {
    const numericKey = Number(key);
    result[String(idMap.get(numericKey) ?? numericKey)] = value;
    return result;
  }, {});
}

export function migrateClientState(): void {
  if (typeof window === 'undefined' || window.localStorage.getItem(MIGRATION_KEY)) return;

  const legacyFavorites = readFirst<LegacyAnime[]>([FAVORITES_KEY, 'anistream_favorites_v1', 'anistream_favorites'], []);
  const idMap = new Map<number, number>();
  const favorites = legacyFavorites.reduce<LegacyAnime[]>((result, anime) => {
    const oldId = anime.mal_id;
    const nextId = canonicalId(anime);
    if (!nextId) return result;
    if (typeof oldId === 'number') idMap.set(oldId, nextId);
    const normalized = anime.kenjitsu?.anilistId != null
      ? { ...anime, mal_id: nextId, kenjitsu: { ...anime.kenjitsu, anilistId: nextId } }
      : { ...anime };
    if (!result.some((item) => item.mal_id === nextId)) result.push(normalized);
    return result;
  }, []);

  const newEpisodes = remapRecord(readFirst<Record<string, unknown>>([NEW_EPISODES_KEY, 'anistream_new_episodes_map_v1', 'anistream_new_episodes_map'], {}), idMap);
  const seenEpisodes = remapRecord(readFirst<Record<string, unknown>>([SEEN_EPISODES_KEY, 'anistream_seen_episodes_v1', 'anistream_seen_episodes'], {}), idMap);
  const watchProgress = readFirst<Record<string, { animeId?: number; [key: string]: unknown }>>([WATCH_PROGRESS_KEY, 'anistream_watch_progress_v1', 'anistream_watch_progress'], {});
  const remappedWatchProgress = Object.entries(watchProgress).reduce<Record<string, unknown>>((result, [key, value]) => {
    const animeId = typeof value.animeId === 'number' ? (idMap.get(value.animeId) ?? value.animeId) : undefined;
    const nextValue = animeId ? { ...value, animeId } : value;
    const nextKey = animeId && key.includes('_ep_') ? key.replace(/^\d+(?=_ep_)/, String(animeId)) : key;
    result[nextKey] = nextValue;
    return result;
  }, {});
  const playbackProgress = readFirst<Record<string, { animeId?: string; [key: string]: unknown }>>([PLAYBACK_PROGRESS_KEY, 'anistream_playback_progress'], {});
  const remappedPlaybackProgress = Object.fromEntries(Object.entries(playbackProgress).map(([key, value]) => {
    const numericId = Number(value.animeId);
    const nextId = Number.isFinite(numericId) ? idMap.get(numericId) ?? numericId : value.animeId;
    return [key, nextId ? { ...value, animeId: String(nextId) } : value];
  }));

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  window.localStorage.setItem(NEW_EPISODES_KEY, JSON.stringify(newEpisodes));
  window.localStorage.setItem(SEEN_EPISODES_KEY, JSON.stringify(seenEpisodes));
  window.localStorage.setItem(
    LAST_CHECK_KEY,
    window.localStorage.getItem(LAST_CHECK_KEY)
      || window.localStorage.getItem('anistream_last_check_time_v1')
      || window.localStorage.getItem('anistream_last_check_time')
      || '',
  );
  window.localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(remappedWatchProgress));
  window.localStorage.setItem(PLAYBACK_PROGRESS_KEY, JSON.stringify(remappedPlaybackProgress));
  window.localStorage.setItem(MIGRATION_KEY, JSON.stringify({ version: 2, migratedAt: new Date().toISOString(), migratedFavorites: favorites.length }));
}

export const clientStateStorageKeys = {
  favorites: FAVORITES_KEY,
  newEpisodes: NEW_EPISODES_KEY,
  seenEpisodes: SEEN_EPISODES_KEY,
  lastCheck: LAST_CHECK_KEY,
  watchProgress: WATCH_PROGRESS_KEY,
  playbackProgress: PLAYBACK_PROGRESS_KEY,
};
