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

// Fallback em memória transparente quando o IndexedDB é desativado ou estoura quota
const memoryCacheMap = new Map<string, any>();

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not supported or running on server.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('catalog')) {
        const catalogStore = db.createObjectStore('catalog', { keyPath: 'key' });
        catalogStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'mal_id' });
        favStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('anime_details')) {
        const detailsStore = db.createObjectStore('anime_details', { keyPath: 'mal_id' });
        detailsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

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
    memoryCacheMap.set(`catalog_${key}`, data);
    try {
      const db = await getDB();
      const tx = db.transaction('catalog', 'readwrite');
      const store = tx.objectStore('catalog');
      store.put({ key, data, updatedAt: Date.now() });

      const itemsList = data && Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : null;
      if (itemsList && itemsList.length > 0) {
        const detailsTx = db.transaction('anime_details', 'readwrite');
        const detailsStore = detailsTx.objectStore('anime_details');
        for (const item of itemsList) {
          if (item && item.mal_id) {
            detailsStore.put({ mal_id: item.mal_id, data: item, updatedAt: Date.now() });
            memoryCacheMap.set(`details_${item.mal_id}`, item);
          }
        }
      }
    } catch (e) {
      console.warn('Fallback para cache em memória ativado para catalog store:', e);
    }
  },

  // Get cached catalog query
  async getCatalog(key: string): Promise<any | null> {
    try {
      const db = await getDB();
      return await new Promise((resolve) => {
        const tx = db.transaction('catalog', 'readonly');
        const store = tx.objectStore('catalog');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : memoryCacheMap.get(`catalog_${key}`) || null);
        req.onerror = () => resolve(memoryCacheMap.get(`catalog_${key}`) || null);
      });
    } catch {
      return memoryCacheMap.get(`catalog_${key}`) || null;
    }
  },

  // Favorites management
  async saveFavorite(anime: JikanAnime): Promise<void> {
    if (!anime || !anime.mal_id) return;
    memoryCacheMap.set(`fav_${anime.mal_id}`, anime);
    try {
      const db = await getDB();
      const tx = db.transaction(['favorites', 'anime_details'], 'readwrite');
      tx.objectStore('favorites').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
      tx.objectStore('anime_details').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Fallback para cache em memória ativado para favorites:', e);
    }
  },

  async removeFavorite(malId: number): Promise<void> {
    memoryCacheMap.delete(`fav_${malId}`);
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
      return await new Promise((resolve) => {
        const tx = db.transaction('favorites', 'readonly');
        const store = tx.objectStore('favorites');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.length > 0 ? list.map((item: any) => item.data) : Array.from(memoryCacheMap.values()).filter((i: any) => i && i.mal_id));
        };
        req.onerror = () => resolve(Array.from(memoryCacheMap.values()).filter((i: any) => i && i.mal_id));
      });
    } catch {
      return Array.from(memoryCacheMap.values()).filter((i: any) => i && i.mal_id);
    }
  },

  // Anime details
  async saveAnimeDetails(anime: JikanAnime): Promise<void> {
    if (!anime || !anime.mal_id) return;
    memoryCacheMap.set(`details_${anime.mal_id}`, anime);
    try {
      const db = await getDB();
      const tx = db.transaction('anime_details', 'readwrite');
      tx.objectStore('anime_details').put({ mal_id: anime.mal_id, data: anime, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Fallback para cache em memória ativado para anime details:', e);
    }
  },

  async getAnimeDetails(malId: number): Promise<JikanAnime | null> {
    try {
      const db = await getDB();
      return await new Promise((resolve) => {
        const tx = db.transaction('anime_details', 'readonly');
        const store = tx.objectStore('anime_details');
        const req = store.get(malId);
        req.onsuccess = () => resolve(req.result ? req.result.data : memoryCacheMap.get(`details_${malId}`) || null);
        req.onerror = () => resolve(memoryCacheMap.get(`details_${malId}`) || null);
      });
    } catch {
      return memoryCacheMap.get(`details_${malId}`) || null;
    }
  },

  // Episodes
  async saveEpisodes(animeId: number, episodes: JikanEpisode[]): Promise<void> {
    if (!animeId) return;
    memoryCacheMap.set(`episodes_${animeId}`, episodes);
    try {
      const db = await getDB();
      const tx = db.transaction('episodes', 'readwrite');
      tx.objectStore('episodes').put({ animeId, data: episodes, updatedAt: Date.now() });
    } catch (e) {
      console.warn('Fallback para cache em memória ativado para episódios:', e);
    }
  },

  async getEpisodes(animeId: number): Promise<JikanEpisode[] | null> {
    try {
      const db = await getDB();
      return await new Promise((resolve) => {
        const tx = db.transaction('episodes', 'readonly');
        const store = tx.objectStore('episodes');
        const req = store.get(animeId);
        req.onsuccess = () => resolve(req.result ? req.result.data : memoryCacheMap.get(`episodes_${animeId}`) || null);
        req.onerror = () => resolve(memoryCacheMap.get(`episodes_${animeId}`) || null);
      });
    } catch {
      return memoryCacheMap.get(`episodes_${animeId}`) || null;
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
      return Array.from(memoryCacheMap.values()).filter((i: any) => i && i.mal_id);
    }
  },
};
