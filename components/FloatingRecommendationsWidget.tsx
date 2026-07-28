'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  Heart,
  Play,
  Settings,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ThumbsUp,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { jikanService } from '@/services/jikan';
import { SafeImage } from './SafeImage';
import { RatingBadge } from './RatingBadge';
import { Tooltip } from './Tooltip';

export function FloatingRecommendationsWidget() {
  const { favorites, recommendationsEnabled, toggleRecommendationsEnabled, isFavorite, toggleFavoriteWithConfirm } =
    useFavorites();
  const { getWatchHistory } = useWatchProgress();

  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const watchHistory = getWatchHistory();

  // Calculate user preference profile based on FAVORITES and WATCHED ANIMES
  const { topGenreIds, topGenreNames, userAnimeIds } = useMemo(() => {
    const genreMap: Record<number, { count: number; name: string }> = {};
    const animeIdsSet = new Set<number>();

    // 1. Process explicit favorites (Weight: 3)
    favorites.forEach((anime) => {
      animeIdsSet.add(anime.mal_id);
      if (anime.genres && anime.genres.length > 0) {
        anime.genres.forEach((g) => {
          if (!genreMap[g.mal_id]) {
            genreMap[g.mal_id] = { count: 0, name: g.name };
          }
          genreMap[g.mal_id].count += 3;
        });
      }
    });

    // 2. Process watch history (Weight: 2 per watched item)
    watchHistory.forEach((hist) => {
      animeIdsSet.add(hist.animeId);
      // If we don't have anime genres directly in history, the id is guarded in animeIdsSet to exclude from recommendations
    });

    // Sort genres by weight
    const sortedGenres = Object.entries(genreMap)
      .map(([idStr, info]) => ({ id: Number(idStr), ...info }))
      .sort((a, b) => b.count - a.count);

    const topIds = sortedGenres.slice(0, 3).map((g) => g.id);
    const topNames = sortedGenres.slice(0, 3).map((g) => g.name);

    return {
      topGenreIds: topIds,
      topGenreNames: topNames,
      userAnimeIds: animeIdsSet,
    };
  }, [favorites, watchHistory]);

  const primaryGenreId = topGenreIds[0];

  // Fetch recommendations based on primary genre derived from favorites + history
  const { data: recommendedData, isLoading } = useQuery({
    queryKey: ['floatingRecommendations', primaryGenreId],
    queryFn: () => jikanService.getAnimeByGenre(primaryGenreId, 1, 20),
    enabled: !!primaryGenreId && recommendationsEnabled,
  });

  // Filter out animes already favorited or watched
  const recommendations = useMemo(() => {
    if (!recommendedData?.data) return [];
    return recommendedData.data.filter((anime) => !userAnimeIds.has(anime.mal_id)).slice(0, 10);
  }, [recommendedData, userAnimeIds]);

  // Don't render floating icon if user globally disabled recommendations in Favorites settings OR dismissed it
  if (!recommendationsEnabled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 animate-bounce-subtle">
        {/* Main Floating Trigger */}
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#FF6B00] via-amber-500 to-purple-600 text-white font-black text-xs sm:text-sm shadow-2xl shadow-[#FF6B00]/40 hover:scale-105 active:scale-95 transition-all border border-white/20"
        >
          <span className="relative flex items-center justify-center">
            <Sparkles size={18} className="animate-spin-slow text-yellow-200" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </span>

          <span className="tracking-tight hidden sm:inline">Para Você</span>
          <span className="tracking-tight sm:hidden">Recomendações</span>

          {recommendations.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-black border border-white/20">
              {recommendations.length}
            </span>
          )}
        </button>

        {/* Small Close/Dismiss Floating Icon */}
        <Tooltip content="Ocultar ícone flutuante" position="top">
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 rounded-full bg-black/80 hover:bg-black text-gray-400 hover:text-white border border-white/10 transition-colors shadow-lg"
          >
            <X size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Recommendations Slide-Over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />

          {/* Drawer Container */}
          <div className="w-full sm:w-[480px] h-full bg-[#0D0E15] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-[#181024] via-[#12131C] to-[#0D0E15] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/30 text-[#FF6B00]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    Recomendações Para Você
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Sugeridos com base nos seus favoritos e episódios assistidos
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Profile Preferences Summary */}
            <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-400">Gêneros em Destaque:</span>
                {topGenreNames.length > 0 ? (
                  <span className="text-[#FF6B00] font-extrabold">{topGenreNames.join(', ')}</span>
                ) : (
                  <span className="text-gray-400 italic">Animes Populares</span>
                )}
              </div>

              <Link
                href="/favoritos"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-gray-400 hover:text-[#FF6B00] flex items-center gap-1 transition-colors"
                title="Configurar recomendações na página de Favoritos"
              >
                <Settings size={12} />
                <span>Ajustar</span>
              </Link>
            </div>

            {/* Recommendations Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                recommendations.map((anime) => {
                  const title = anime.title || anime.title_english || 'Anime';
                  const imageUrl =
                    anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url;
                  const favorited = isFavorite(anime.mal_id);

                  return (
                    <div
                      key={anime.mal_id}
                      className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#FF6B00]/30 transition-all"
                    >
                      {/* Cover Poster */}
                      <Link
                        href={`/anime/${anime.mal_id}`}
                        onClick={() => setIsOpen(false)}
                        className="relative w-16 h-22 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10"
                      >
                        <SafeImage
                          src={imageUrl}
                          alt={title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </Link>

                      {/* Info & Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <Link
                          href={`/anime/${anime.mal_id}`}
                          onClick={() => setIsOpen(false)}
                          className="block font-black text-xs sm:text-sm text-white hover:text-[#FF6B00] transition-colors line-clamp-1"
                        >
                          {title}
                        </Link>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          {anime.score && <RatingBadge score={anime.score} size="sm" />}
                          {anime.type && (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-semibold text-gray-300">
                              {anime.type}
                            </span>
                          )}
                          {anime.episodes && (
                            <span>{anime.episodes} eps</span>
                          )}
                        </div>

                        {anime.genres && anime.genres.length > 0 && (
                          <p className="text-[10px] text-gray-400 line-clamp-1">
                            {anime.genres.map((g) => g.name).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Tooltip content="Assistir" position="left">
                          <Link
                            href={`/anime/${anime.mal_id}`}
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white shadow-md transition-all flex items-center justify-center"
                          >
                            <Play size={14} className="fill-current ml-0.5" />
                          </Link>
                        </Tooltip>

                        <Tooltip content={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} position="left">
                          <button
                            onClick={() => toggleFavoriteWithConfirm(anime)}
                            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                              favorited
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10'
                            }`}
                          >
                            <Heart size={14} className={favorited ? 'fill-current' : ''} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Nenhuma recomendação nova</h3>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Adicione mais animes aos seus favoritos ou assista a novos episódios para que possamos mapear o seu perfil com mais precisão.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0A0B10] flex items-center justify-between text-xs">
              <button
                onClick={toggleRecommendationsEnabled}
                className="text-gray-400 hover:text-rose-400 transition-colors font-medium flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} />
                <span>Desativar recomendações</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
