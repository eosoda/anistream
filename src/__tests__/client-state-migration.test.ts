import { afterEach, describe, expect, it } from 'vitest';
import { clientStateStorageKeys, migrateClientState } from '@/lib/storage/client-state-migration';

class MemoryStorage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function installWindow(storage: MemoryStorage) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('client state migration', () => {
  it('moves Kenjitsu identifiers and preserves legacy records without inventing mappings', () => {
    const storage = new MemoryStorage();
    installWindow(storage);
    storage.setItem('anistream_favorites_v1', JSON.stringify([
      { mal_id: 101, title: 'Kenjitsu title', kenjitsu: { anilistId: 1001 } },
      { mal_id: 202, title: 'Legacy title' },
    ]));
    storage.setItem('anistream_new_episodes_map_v1', JSON.stringify({ 101: { hasNewEpisode: true }, 202: { hasNewEpisode: false } }));
    storage.setItem('anistream_seen_episodes_v1', JSON.stringify({ 101: { lastSeenEp: 3 } }));
    storage.setItem('anistream_watch_progress_v1', JSON.stringify({ '101_ep_3': { animeId: 101, episodeNum: 3, percentage: 44 } }));
    storage.setItem('anistream_playback_progress', JSON.stringify({ episode: { animeId: '101', currentTime: 12 } }));

    migrateClientState();

    expect(JSON.parse(storage.getItem(clientStateStorageKeys.favorites) || '[]')).toEqual([
      { mal_id: 1001, title: 'Kenjitsu title', kenjitsu: { anilistId: 1001 } },
      { mal_id: 202, title: 'Legacy title' },
    ]);
    expect(JSON.parse(storage.getItem(clientStateStorageKeys.newEpisodes) || '{}')).toEqual({
      1001: { hasNewEpisode: true },
      202: { hasNewEpisode: false },
    });
    expect(JSON.parse(storage.getItem(clientStateStorageKeys.seenEpisodes) || '{}')).toEqual({ 1001: { lastSeenEp: 3 } });
    expect(JSON.parse(storage.getItem(clientStateStorageKeys.watchProgress) || '{}')).toEqual({
      '1001_ep_3': { animeId: 1001, episodeNum: 3, percentage: 44 },
    });
    expect(JSON.parse(storage.getItem(clientStateStorageKeys.playbackProgress) || '{}')).toEqual({
      episode: { animeId: '1001', currentTime: 12 },
    });
    expect(storage.getItem('anistream_favorites_v1')).not.toBeNull();
    expect(storage.getItem('anistream_client_state_migration_v2')).not.toBeNull();
  });

  it('is idempotent after the migration marker is written', () => {
    const storage = new MemoryStorage();
    installWindow(storage);
    storage.setItem('anistream_favorites_v2', JSON.stringify([{ mal_id: 1001, title: 'Original' }]));

    migrateClientState();
    storage.setItem('anistream_favorites_v2', JSON.stringify([{ mal_id: 1001, title: 'Updated in session' }]));
    migrateClientState();

    expect(JSON.parse(storage.getItem(clientStateStorageKeys.favorites) || '[]')[0].title).toBe('Updated in session');
  });
});
