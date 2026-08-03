'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { CompactAnimeCard } from '@/components/anime/CompactAnimeCard';
import { ViewToggle, ViewMode } from '@/components/catalog/ViewToggle';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PopularPage() {
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('anistream_view_mode') as ViewMode;
    return stored === 'grid' || stored === 'list' ? stored : 'grid';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('anistream_view_mode', mode);
    }
  };

  const { data: topData, isLoading, isError, refetch } = useQuery({
    queryKey: ['topAnimeList', page],
    queryFn: () => jikanService.getTopAnime('all', undefined, page, 24),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <Flame size={24} />
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Animes mais Populares
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            Ranking dos animes mais aclamados, assistidos e favoritados no mundo.
          </p>
        </div>

        <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Erro ao carregar ranking de animes"
          description="O catalogo Kenjitsu pode estar com alta demanda no momento. Clique abaixo para carregar novamente."
          onRetry={refetch}
          retryText="Tentar novamente"
        />
      )}

      {/* Anime Grid vs Compact List */}
      {!isError && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoading
              ? Array.from({ length: 24 }).map((_, i) => <AnimeCardSkeleton key={i} />)
              : topData?.data?.map((anime, index) => (
                  <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        ) : (
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                ))
              : topData?.data?.map((anime, index) => (
                  <CompactAnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        )
      )}

      {!isLoading && !isError && topData?.data?.length === 0 && (
        <EmptyState
          title="Nenhum anime encontrado"
          description="O ranking não possui resultados disponíveis nesta página."
        />
      )}

      {/* Pagination */}
      {topData?.pagination?.has_next_page && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              page > 1
                ? 'bg-white/10 hover:bg-[#FF6B00] text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <span className="text-xs font-bold text-gray-300 px-3 py-1.5 rounded-lg bg-white/5">
            Página {page}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!topData.pagination.has_next_page}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              topData.pagination.has_next_page
                ? 'bg-white/10 hover:bg-[#FF6B00] text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
