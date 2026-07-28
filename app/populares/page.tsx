'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { AnimeCard } from '@/components/AnimeCard';
import { CompactAnimeCard } from '@/components/CompactAnimeCard';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { AnimeCardSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';

const TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'tv', label: 'Séries TV' },
  { id: 'movie', label: 'Filmes' },
  { id: 'ova', label: 'OVAs' },
  { id: 'ona', label: 'ONAs' },
  { id: 'special', label: 'Especiais' },
];

export default function PopularPage() {
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('anistream_view_mode') as ViewMode;
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('anistream_view_mode', mode);
    }
  };

  // Query Top Anime with type filter
  const { data: topData, isLoading, isError, refetch } = useQuery({
    queryKey: ['topAnimeList', activeType, page],
    queryFn: () => jikanService.getTopAnime(activeType, undefined, page, 24),
  });

  const handleFilterChange = (typeId: string) => {
    setActiveType(typeId);
    setPage(1);
  };

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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-2 rounded-2xl glass-panel border border-white/10">
        <span className="text-xs font-bold text-gray-400 px-3 flex items-center gap-1.5 whitespace-nowrap">
          <Filter size={14} className="text-[#FF6B00]" /> Formato:
        </span>
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
              className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 border border-[#FF6B00]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Erro ao carregar ranking de animes"
          description="A API do Jikan pode estar com alta demanda no momento. Clique abaixo para carregar novamente."
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
          title="Nenhum anime neste formato"
          description="Selecione outro filtro para visualizar o ranking de animes."
          onAction={() => handleFilterChange('all')}
          actionText="Ver Todos os Formatos"
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
