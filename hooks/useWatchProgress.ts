'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EpisodeProgress {
  animeId: number;
  animeTitle: string;
  animeImage?: string;
  episodeNum: number;
  episodeTitle?: string;
  currentTime: number; // seconds
  duration: number; // seconds
  percentage: number; // 0-100
  updatedAt: number; // timestamp
  completed: boolean;
}

const STORAGE_KEY = 'anistream_watch_progress_v1';

export function useWatchProgress() {
  const [progressMap, setProgressMap] = useState<Record<string, EpisodeProgress>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to load watch progress from localStorage', e);
      return {};
    }
  });

  // Save to localStorage when state updates
  const saveToStorage = (newMap: Record<string, EpisodeProgress>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('anistream_progress_updated'));
      }
    } catch (e) {
      console.error('Failed to save watch progress to localStorage', e);
    }
  };

  // Sync state across components & tabs
  useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setProgressMap(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to reload watch progress from localStorage', e);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('anistream_progress_updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('anistream_progress_updated', handleStorage);
    };
  }, []);

  const getKey = (animeId: number, episodeNum: number) => `${animeId}_ep_${episodeNum}`;

  const saveProgress = useCallback((data: {
    animeId: number;
    animeTitle: string;
    animeImage?: string;
    episodeNum: number;
    episodeTitle?: string;
    currentTime: number;
    duration: number;
  }) => {
    if (!data.animeId || !data.episodeNum || !data.duration || data.duration <= 0) return;

    const percentage = Math.min(100, Math.max(0, Math.round((data.currentTime / data.duration) * 100)));
    const completed = percentage >= 88;

    const key = `${data.animeId}_ep_${data.episodeNum}`;
    const progressItem: EpisodeProgress = {
      ...data,
      percentage,
      completed,
      updatedAt: Date.now(),
    };

    setProgressMap((prev) => {
      const updated = { ...prev, [key]: progressItem };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const getProgress = useCallback((animeId: number, episodeNum: number): EpisodeProgress | null => {
    const key = getKey(animeId, episodeNum);
    return progressMap[key] || null;
  }, [progressMap]);

  const getAnimeProgress = useCallback((animeId: number): EpisodeProgress[] => {
    return Object.values(progressMap).filter((item) => item.animeId === animeId);
  }, [progressMap]);

  const getContinueWatchingList = useCallback((): EpisodeProgress[] => {
    return Object.values(progressMap)
      .filter((item) => item.percentage > 1 && !item.completed)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [progressMap]);

  const getWatchHistory = useCallback((): EpisodeProgress[] => {
    return Object.values(progressMap).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [progressMap]);

  const removeProgress = useCallback((animeId: number, episodeNum: number) => {
    const key = getKey(animeId, episodeNum);
    setProgressMap((prev) => {
      const copy = { ...prev };
      delete copy[key];
      saveToStorage(copy);
      return copy;
    });
  }, []);

  const clearAllProgress = useCallback(() => {
    setProgressMap({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getAnimeOverallProgress = useCallback(
    (animeId: number, totalEpisodes?: number | null) => {
      const epList = Object.values(progressMap).filter((item) => item.animeId === animeId);
      if (epList.length === 0) return null;

      // Count completed episodes or max episode reached
      const completedSet = new Set(epList.filter((e) => e.completed || e.percentage >= 80).map((e) => e.episodeNum));
      const maxEp = Math.max(0, ...epList.map((e) => e.episodeNum));
      const watchedEpCount = Math.max(completedSet.size, maxEp);

      const total = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : null;
      const percentage = total ? Math.min(100, Math.round((watchedEpCount / total) * 100)) : null;

      return {
        watchedEpCount,
        totalEpisodes: total,
        percentage,
        isFinished: total ? watchedEpCount >= total : false,
        lastWatchedEp: maxEp,
      };
    },
    [progressMap]
  );

  return {
    progressMap,
    saveProgress,
    getProgress,
    getAnimeProgress,
    getAnimeOverallProgress,
    getContinueWatchingList,
    getWatchHistory,
    removeProgress,
    clearAllProgress,
  };
}
