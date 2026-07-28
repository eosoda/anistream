import { JikanAnime, JikanEpisode } from '@/types/anime';

const DB_NAME = 'AniStreamOfflineDB';
const DB_VERSION = 1;

export interface CachedCatalogItem {
  key: string;
  data: any;
  updatedAt: number;
}

export interface CachedAnimeDetails {
  mal_id: number;
  data: JikanAnime;
  updatedAt: number;
}

export interface CachedEpisodes {
  animeId: number;
  data: JikanEpisode[];
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not supported or running on server.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Catalog queries store
      if (!db.objectStoreNames.contains('catalog')) {
        const catalogStore = db.createObjectStore('catalog', { keyPath: 'key' });
        catalogStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Favorited anime store
      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'mal_id' });
        favStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Detailed anime store
      if (!db.objectStoreNames.contains('anime_details')) {
        const detailsStore = db.createObjectStore('anime_details', { keyPath: 'mal_id' });
        detailsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Episodes store
      if (!db.objectStoreNames.contains('episodes')) {
        const epStore = db.createObjectStore('episodes', { keyPath: 'animeId' });
        epStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export const offlineCacheDB = {
  // Save query or list result into catalog store & cache individual anime items
  async saveCatalog(key: string, data: any): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('catalog', 'readwrite');
      const store = tx.objectStore('catalog');
      store.put({ key, data, updatedAt: Date.now() });

      // Save individual anime objects to anime_details for offline lookup
      const itemsList = data && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : null;
      if (itemsList && itemsList.length > 0) {
        const detailsTx = db.transaction('anime_details', 'readwrite');
        const detailsStore = detailsTx.objectStore('anime_details');
        for (const item of itemsList) {
          if (item && item.mal_id) {
            detailsStore.put({ mal_id: item.mal_id, data: item, updatedAt: Date.now() });
          }
        }
      }
    } catch (e) {
      console.warn('Error saving to IndexedDB catalog store:', e);
    }
  },

  // Get cached catalog query
  async getCatalog(key: string): Promise<any | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('catalog', 'readonly');
        const store = tx.objectStore('catalog');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  // Favorites management
  async saveFavorite(anime: JikanAnime): Promise<void> {
    if (!anime || !anime.mal_id) return;
    try {
      const db = await getDB();
      const tx = db.transaction(['favorites', 'anime_details'], 'readwrite');
      tx.objectStore('favorites').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
      tx.objectStore('anime_details').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Error saving favorite to IndexedDB:', e);
    }
  },

  async removeFavorite(malId: number): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('favorites', 'readwrite');
      tx.objectStore('favorites').delete(malId);
    } catch (e) {
      console.warn('Error removing favorite from IndexedDB:', e);
    }
  },

  async getFavorites(): Promise<JikanAnime[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('favorites', 'readonly');
        const store = tx.objectStore('favorites');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.map((item: any) => item.data));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  // Anime details
  async saveAnimeDetails(anime: JikanAnime): Promise<void> {
    if (!anime || !anime.mal_id) return;
    try {
      const db = await getDB();
      const tx = db.transaction('anime_details', 'readwrite');
      tx.objectStore('anime_details').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Error saving anime details to IndexedDB:', e);
    }
  },

  async getAnimeDetails(malId: number): Promise<JikanAnime | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('anime_details', 'readonly');
        const store = tx.objectStore('anime_details');
        const req = store.get(malId);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  // Episodes
  async saveEpisodes(animeId: number, episodes: JikanEpisode[]): Promise<void> {
    if (!animeId) return;
    try {
      const db = await getDB();
      const tx = db.transaction('episodes', 'readwrite');
      tx.objectStore('episodes').put({ animeId, data: episodes, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Error saving episodes to IndexedDB:', e);
    }
  },

  async getEpisodes(animeId: number): Promise<JikanEpisode[] | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('episodes', 'readonly');
        const store = tx.objectStore('episodes');
        const req = store.get(animeId);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  // Retrieve all unique cached anime across favorites, details, and catalog for offline fallback
  async getAllCachedAnimes(): Promise<JikanAnime[]> {
    try {
      const db = await getDB();
      const detailsPromise = new Promise<JikanAnime[]>((resolve) => {
        const tx = db.transaction('anime_details', 'readonly');
        const store = tx.objectStore('anime_details');
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []).map((i: any) => i.data));
        req.onerror = () => resolve([]);
      });

      const favsPromise = this.getFavorites();

      const [details, favs] = await Promise.all([detailsPromise, favsPromise]);
      const map = new Map<number, JikanAnime>();
      for (const item of details) {
        if (item && item.mal_id) map.set(item.mal_id, item);
      }
      for (const item of favs) {
        if (item && item.mal_id) map.set(item.mal_id, item);
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  },
};
