'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JikanAnime, JikanEpisode } from '@/types/anime';
import { jikanService } from '@/services/jikan';

const FAVORITES_KEY = 'anistream_favorites_v1';
const NEW_EPISODES_MAP_KEY = 'anistream_new_episodes_map_v1';
const SEEN_EPISODES_KEY = 'anistream_seen_episodes_v1';
const LAST_CHECK_TIME_KEY = 'anistream_last_check_time_v1';

export interface NewEpisodeInfo {
  hasNewEpisode: boolean;
  latestEpisodeNum?: number;
  latestEpisodeTitle?: string;
  airedDate?: string;
  isAiring?: boolean;
  broadcastString?: string;
  lastChecked?: number;
}

const RECOMMENDATIONS_ENABLED_KEY = 'anistream_recommendations_enabled_v1';

export interface SeenRecord {
  lastSeenEp?: number;
  lastSeenTimestamp?: number;
}

interface FavoritesContextType {
  favorites: JikanAnime[];
  addFavorite: (anime: JikanAnime) => void;
  removeFavorite: (malId: number) => void;
  isFavorite: (malId: number) => boolean;
  toggleFavorite: (anime: JikanAnime) => void;
  newEpisodesMap: Record<number, NewEpisodeInfo>;
  newEpisodesCount: number;
  isCheckingNewEpisodes: boolean;
  lastCheckTime: Date | null;
  checkNewEpisodes: (forceRefresh?: boolean) => Promise<void>;
  markAsSeen: (malId: number, epNum?: number) => void;
  markAllAsSeen: () => void;
  recommendationsEnabled: boolean;
  setRecommendationsEnabled: (enabled: boolean) => void;
  toggleRecommendationsEnabled: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [recommendationsEnabled, setRecommendationsEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(RECOMMENDATIONS_ENABLED_KEY);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const setRecommendationsEnabled = (enabled: boolean) => {
    setRecommendationsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(RECOMMENDATIONS_ENABLED_KEY, JSON.stringify(enabled));
    }
  };

  const toggleRecommendationsEnabled = () => {
    setRecommendationsEnabled(!recommendationsEnabled);
  };
  const [favorites, setFavorites] = useState<JikanAnime[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const storedFavs = localStorage.getItem(FAVORITES_KEY);
      return storedFavs ? JSON.parse(storedFavs) : [];
    } catch {
      return [];
    }
  });

  const [newEpisodesMap, setNewEpisodesMap] = useState<Record<number, NewEpisodeInfo>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const storedMap = localStorage.getItem(NEW_EPISODES_MAP_KEY);
      return storedMap ? JSON.parse(storedMap) : {};
    } catch {
      return {};
    }
  });

  const [isCheckingNewEpisodes, setIsCheckingNewEpisodes] = useState<boolean>(false);

  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedTime = localStorage.getItem(LAST_CHECK_TIME_KEY);
      return storedTime ? new Date(parseInt(storedTime, 10)) : null;
    } catch {
      return null;
    }
  });

  // Save favorites to LocalStorage
  const saveFavorites = (updated: JikanAnime[]) => {
    setFavorites(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    }
  };

  const addFavorite = (anime: JikanAnime) => {
    setFavorites((prev) => {
      if (prev.some((a) => a.mal_id === anime.mal_id)) return prev;
      const updated = [anime, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFavorite = (malId: number) => {
    setFavorites((prev) => {
      const updated = prev.filter((a) => a.mal_id !== malId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });

    // Also remove from newEpisodesMap
    setNewEpisodesMap((prev) => {
      const copy = { ...prev };
      delete copy[malId];
      if (typeof window !== 'undefined') {
        localStorage.setItem(NEW_EPISODES_MAP_KEY, JSON.stringify(copy));
      }
      return copy;
    });
  };

  const isFavorite = (malId: number) => {
    return favorites.some((a) => a.mal_id === malId);
  };

  const toggleFavorite = (anime: JikanAnime) => {
    if (isFavorite(anime.mal_id)) {
      removeFavorite(anime.mal_id);
    } else {
      addFavorite(anime);
    }
  };

  // Helper to load seen records
  const getSeenRecords = (): Record<number, SeenRecord> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(SEEN_EPISODES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Mark a specific anime episode as seen
  const markAsSeen = useCallback((malId: number, epNum?: number) => {
    if (typeof window === 'undefined') return;

    // Update seen records
    const seenRecords = getSeenRecords();
    const currentEpNum = epNum || newEpisodesMap[malId]?.latestEpisodeNum || 1;
    seenRecords[malId] = {
      lastSeenEp: currentEpNum,
      lastSeenTimestamp: Date.now(),
    };
    localStorage.setItem(SEEN_EPISODES_KEY, JSON.stringify(seenRecords));

    // Update new episodes map
    setNewEpisodesMap((prev) => {
      const existing = prev[malId];
      if (!existing) return prev;

      const updatedMap = {
        ...prev,
        [malId]: {
          ...existing,
          hasNewEpisode: false,
        },
      };

      localStorage.setItem(NEW_EPISODES_MAP_KEY, JSON.stringify(updatedMap));
      return updatedMap;
    });
  }, [newEpisodesMap]);

  // Mark all favorite animes as seen
  const markAllAsSeen = useCallback(() => {
    if (typeof window === 'undefined') return;

    const seenRecords = getSeenRecords();
    const now = Date.now();

    Object.keys(newEpisodesMap).forEach((idStr) => {
      const id = parseInt(idStr, 10);
      const epNum = newEpisodesMap[id]?.latestEpisodeNum || 1;
      seenRecords[id] = {
        lastSeenEp: epNum,
        lastSeenTimestamp: now,
      };
    });

    localStorage.setItem(SEEN_EPISODES_KEY, JSON.stringify(seenRecords));

    setNewEpisodesMap((prev) => {
      const updatedMap: Record<number, NewEpisodeInfo> = {};
      Object.keys(prev).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        updatedMap[id] = {
          ...prev[id],
          hasNewEpisode: false,
        };
      });

      localStorage.setItem(NEW_EPISODES_MAP_KEY, JSON.stringify(updatedMap));
      return updatedMap;
    });
  }, [newEpisodesMap]);

  // Verify airing dates and latest episodes via Jikan API
  const checkNewEpisodes = useCallback(
    async (forceRefresh = false) => {
      if (favorites.length === 0) {
        setNewEpisodesMap({});
        return;
      }

      // Avoid re-checking if checked less than 15 minutes ago unless forced
      const now = Date.now();
      if (!forceRefresh && lastCheckTime && now - lastCheckTime.getTime() < 1000 * 60 * 15) {
        return;
      }

      setIsCheckingNewEpisodes(true);
      const seenRecords = getSeenRecords();
      const updatedMap: Record<number, NewEpisodeInfo> = { ...newEpisodesMap };

      try {
        // Prioritize currently airing or TV animes
        const itemsToCheck = favorites.slice(0, 12); // limit to max 12 to respect rate limits

        for (const anime of itemsToCheck) {
          const isAiring =
            anime.airing ||
            anime.status === 'Currently Airing' ||
            anime.status === 'Airing';

          // If the anime is currently airing, fetch its latest episode data from Jikan
          if (isAiring) {
            try {
              const episodes: JikanEpisode[] = await jikanService.getAnimeEpisodes(anime.mal_id);

              if (episodes && episodes.length > 0) {
                // Latest episode is usually the last in the array
                const latestEp = episodes[episodes.length - 1];
                const latestEpNum = latestEp.mal_id || episodes.length;
                const lastSeenEp = seenRecords[anime.mal_id]?.lastSeenEp || 0;

                // Determine if this episode is new for the user
                let isNew = false;
                if (seenRecords[anime.mal_id]) {
                  isNew = latestEpNum > lastSeenEp;
                } else {
                  // If no seen record exists, check if episode was aired in the last 14 days
                  if (latestEp.aired) {
                    const airedDate = new Date(latestEp.aired).getTime();
                    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
                    isNew = now - airedDate <= fourteenDaysMs;
                  } else {
                    isNew = true; // Default to new for currently airing saved favorite
                  }
                }

                updatedMap[anime.mal_id] = {
                  hasNewEpisode: isNew,
                  latestEpisodeNum: latestEpNum,
                  latestEpisodeTitle: latestEp.title || `Episódio ${latestEpNum}`,
                  airedDate: latestEp.aired || undefined,
                  isAiring: true,
                  broadcastString: anime.broadcast?.string || undefined,
                  lastChecked: now,
                };
              } else {
                // Fallback if episodes list is empty or API response lacks individual episode details
                const lastSeenEp = seenRecords[anime.mal_id]?.lastSeenEp || 0;
                const estimatedEpNum = (anime.episodes || 1) + 1;
                const isNew = !seenRecords[anime.mal_id] || estimatedEpNum > lastSeenEp;

                updatedMap[anime.mal_id] = {
                  hasNewEpisode: isNew,
                  latestEpisodeNum: anime.episodes || 1,
                  latestEpisodeTitle: 'Novo episódio da semana',
                  isAiring: true,
                  broadcastString: anime.broadcast?.string || undefined,
                  lastChecked: now,
                };
              }
            } catch (err) {
              console.warn(`Could not check episodes for anime ${anime.mal_id}:`, err);
              // Fallback based on airing flag
              if (isAiring && !updatedMap[anime.mal_id]) {
                updatedMap[anime.mal_id] = {
                  hasNewEpisode: !seenRecords[anime.mal_id],
                  isAiring: true,
                  broadcastString: anime.broadcast?.string || undefined,
                  lastChecked: now,
                };
              }
            }
          } else {
            // Not currently airing
            updatedMap[anime.mal_id] = {
              hasNewEpisode: false,
              isAiring: false,
              lastChecked: now,
            };
          }
        }

        setNewEpisodesMap(updatedMap);
        setLastCheckTime(new Date(now));

        if (typeof window !== 'undefined') {
          localStorage.setItem(NEW_EPISODES_MAP_KEY, JSON.stringify(updatedMap));
          localStorage.setItem(LAST_CHECK_TIME_KEY, now.toString());
        }
      } catch (e) {
        console.error('Error checking new episodes:', e);
      } finally {
        setIsCheckingNewEpisodes(false);
      }
    },
    [favorites, newEpisodesMap, lastCheckTime]
  );

  // Auto check on mount if favorites exist
  useEffect(() => {
    if (favorites.length > 0) {
      const timer = setTimeout(() => {
        checkNewEpisodes(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [favorites.length, checkNewEpisodes]);

  // Calculate count of unread new episodes
  const newEpisodesCount = Object.values(newEpisodesMap).filter(
    (info) => info.hasNewEpisode
  ).length;

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite,
        newEpisodesMap,
        newEpisodesCount,
        isCheckingNewEpisodes,
        lastCheckTime,
        checkNewEpisodes,
        markAsSeen,
        markAllAsSeen,
        recommendationsEnabled,
        setRecommendationsEnabled,
        toggleRecommendationsEnabled,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
