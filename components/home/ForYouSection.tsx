'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Heart, Compass } from 'lucide-react';
import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { jikanService } from '@/services/jikan';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { JikanAnime } from '@/types/anime';

export function ForYouSection() {
  const { favorites } = useFavorites();
  const { getWatchHistory } = useWatchProgress();

  const watchHistory = getWatchHistory();

  // Extract top genres from favorites & watch history
  const { topGenreIds, topGenreNames, userAnimeIds } = useMemo(() => {
    const genreMap: Record<number, { count: number; name: string }> = {};
    const animeIdsSet = new Set<number>();

    // Collect from favorites
    favorites.forEach((anime) => {
      animeIdsSet.add(anime.mal_id);
      if (anime.genres && anime.genres.length > 0) {
        anime.genres.forEach((g) => {
          if (!genreMap[g.mal_id]) {
            genreMap[g.mal_id] = { count: 0, name: g.name };
          }
          genreMap[g.mal_id].count += 2; // Higher weight for explicit favorites
        });
      }
    });

    // Collect from watch history
    watchHistory.forEach((hist) => {
      animeIdsSet.add(hist.animeId);
    });

    // Sort genres by weight
    const sortedGenres = Object.entries(genreMap)
      .map(([idStr, info]) => ({ id: Number(idStr), ...info }))
      .sort((a, b) => b.count - a.count);

    const topIds = sortedGenres.slice(0, 2).map((g) => g.id);
    const topNames = sortedGenres.slice(0, 2).map((g) => g.name);

    return {
      topGenreIds: topIds,
      topGenreNames: topNames,
      userAnimeIds: animeIdsSet,
    };
  }, [favorites, watchHistory]);

  const primaryGenreId = topGenreIds[0];

  // Fetch recommendations based on user's top genre
  const {
    data: genreAnimeData,
    isLoading: isLoadingGenreAnime,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['forYouRecommendations', primaryGenreId],
    queryFn: () => jikanService.getAnimeByGenre(primaryGenreId, 1, 24),
    enabled: !!primaryGenreId,
  });

  // Filter out animes the user already has in favorites/history
  const recommendedAnimes = useMemo(() => {
    if (!genreAnimeData?.data) return [];
    return genreAnimeData.data.filter((anime) => !userAnimeIds.has(anime.mal_id));
  }, [genreAnimeData, userAnimeIds]);

  // If user has no favorites/history or no primary genre identified yet
  if (!primaryGenreId || favorites.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#181024] via-[#1A1829] to-[#12131C] border border-[#FF6B00]/20 p-6 sm:p-8 shadow-2xl">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              Recomendações Inteligentes
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Para Você: Animes Personalizados
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Adicione animes à sua lista de favoritos ou assista a episódios para ativarmos o nosso recomendador automático baseado nos seus gêneros preferidos!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href="/populares"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#FF6B00]/30"
            >
              <Heart size={16} />
              Explorar Populares
            </Link>
            <Link
              href="/lista"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all"
            >
              <Compass size={16} />
              Ver Lista de Animes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const genreText =
    topGenreNames.length > 0
      ? `Baseado no seu gosto por ${topGenreNames.join(' e ')}`
      : 'Títulos selecionados especialmente com base nos seus favoritos';

  return (
    <div className="space-y-2">
      <AnimeCarousel
        title="Para Você"
        subtitle={genreText}
        icon={<Sparkles size={22} className="text-[#FF6B00]" />}
        animes={recommendedAnimes}
        isLoading={isLoadingGenreAnime}
        viewAllHref="/lista"
      />
    </div>
  );
}
