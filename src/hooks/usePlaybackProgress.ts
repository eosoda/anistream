'use client';

import { useState } from 'react';

export interface PlaybackProgressItem {
  episodeId: string;
  animeId?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
}

const STORAGE_KEY = 'anistream_playback_progress';

export function getStoredProgress(episodeId: string): PlaybackProgressItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    return store[episodeId] || null;
  } catch {
    return null;
  }
}

export function saveStoredProgress(
  episodeId: string,
  currentTime: number,
  duration: number,
  animeId?: string
): void {
  if (typeof window === 'undefined' || !episodeId || duration <= 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};

    const progressPercent = Math.min(100, Math.floor((currentTime / duration) * 100));

    store[episodeId] = {
      episodeId,
      animeId,
      currentTime,
      duration,
      progressPercent,
      updatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

export function usePlaybackProgress(episodeId: string, animeId?: string) {
  const [initialTime] = useState<number>(() => {
    if (!episodeId) return 0;
    const saved = getStoredProgress(episodeId);
    return saved && saved.currentTime > 5 && saved.currentTime < saved.duration - 10
      ? saved.currentTime
      : 0;
  });
  const [progressPercent, setProgressPercent] = useState<number>(() =>
    episodeId ? getStoredProgress(episodeId)?.progressPercent ?? 0 : 0
  );

  const updateProgress = (currentTime: number, duration: number) => {
    if (duration > 0) {
      const pct = Math.min(100, Math.floor((currentTime / duration) * 100));
      setProgressPercent(pct);
      saveStoredProgress(episodeId, currentTime, duration, animeId);
    }
  };

  return { initialTime, progressPercent, updateProgress };
}
