'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import type { JikanAnime } from '@/types/anime';
import { SafeImage } from '@/components/ui/SafeImage';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { Tooltip } from '@/components/ui/Tooltip';

export function FloatingRecommendationsWidget({ initialOpen = false }: { initialOpen?: boolean }) {
  const { favorites, recommendationsEnabled, toggleRecommendationsEnabled, isFavorite, toggleFavoriteWithConfirm } =
    useFavorites();
  const { getWatchHistory } = useWatchProgress();

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isDismissed, setIsDismissed] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState<{
    genreId: number;
    items: JikanAnime[];
  } | null>(null);

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

  useEffect(() => {
    if (!isOpen || !primaryGenreId || !recommendationsEnabled) return;
    let active = true;

    import('@/services/jikan')
      .then(({ jikanService }) => jikanService.getAnimeByGenre(primaryGenreId, 1, 20))
      .then(result => {
        if (active) setRecommendationResult({ genreId: primaryGenreId, items: result.data || [] });
      })
      .catch(() => {
        if (active) setRecommendationResult({ genreId: primaryGenreId, items: [] });
      });

    return () => {
      active = false;
    };
  }, [isOpen, primaryGenreId, recommendationsEnabled]);

  const isLoading = Boolean(
    isOpen && primaryGenreId && recommendationResult?.genreId !== primaryGenreId
  );

  // Filter out animes already favorited or watched
  const recommendations = useMemo(() => {
    const items = recommendationResult && primaryGenreId && recommendationResult.genreId === primaryGenreId
      ? recommendationResult.items
      : [];
    return items.filter((anime) => !userAnimeIds.has(anime.mal_id)).slice(0, 10);
  }, [primaryGenreId, recommendationResult, userAnimeIds]);

  const pathname = usePathname();

  // Don't render floating icon if user globally disabled recommendations in Favorites settings, dismissed it, or on /setup /admin routes
  if (!recommendationsEnabled || isDismissed || pathname?.startsWith('/setup') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-40 flex items-center gap-2 lg:bottom-6 lg:right-6">
        {/* Main Floating Trigger */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir recomendações para você"
          className="group relative flex size-11 items-center justify-center rounded-full border border-white/15 bg-[#FF6B00] text-xs font-black text-white shadow-[0_10px_30px_rgba(255,107,0,0.3)] transition-[transform,background-color,box-shadow] hover:bg-[#FF8533] hover:shadow-[0_12px_34px_rgba(255,107,0,0.4)] active:scale-95 lg:size-auto lg:min-h-11 lg:gap-2.5 lg:px-4 lg:py-2.5 lg:text-sm"
        >
          <span className="relative flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#FF6B00]" />
          </span>

          <span className="hidden tracking-tight lg:inline">Para Você</span>

          {recommendations.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full border-2 border-[#0B0B0F] bg-white px-1 py-0.5 text-center text-[9px] font-black text-[#FF6B00] lg:static lg:border-white/20 lg:bg-black/30 lg:text-white">
              {recommendations.length}
            </span>
          )}
        </button>

        {/* Small Close/Dismiss Floating Icon */}
        <Tooltip content="Ocultar ícone flutuante" position="top">
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Ocultar recomendações"
            className="hidden size-9 items-center justify-center rounded-full border border-white/10 bg-[#121219] text-gray-400 shadow-lg transition-colors hover:bg-white/10 hover:text-white lg:flex"
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
