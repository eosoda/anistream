'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { jikanService, SearchAnimeFilters } from '@/services/jikan';
import { SearchBar } from '@/components/SearchBar';
import { SearchFilters } from '@/components/SearchFilters';
import { AnimeCard } from '@/components/AnimeCard';
import { CompactAnimeCard } from '@/components/CompactAnimeCard';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { AnimeCardSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';

const DEFAULT_FILTERS: SearchAnimeFilters = {
  status: 'all',
  minScore: 0,
  type: 'all',
  orderBy: 'popularity',
  sort: 'desc',
  audioLanguage: 'all',
};

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [prevQuery, setPrevQuery] = useState(query);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchAnimeFilters>(DEFAULT_FILTERS);
  const [isOpenFilters, setIsOpenFilters] = useState(false);

  // View mode state (persistent grid vs compact list)
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

  // Calculate active filters count
  const activeCount =
    (filters.status && filters.status !== 'all' ? 1 : 0) +
    (filters.minScore && filters.minScore > 0 ? 1 : 0) +
    (filters.type && filters.type !== 'all' ? 1 : 0) +
    (filters.orderBy && filters.orderBy !== 'popularity' ? 1 : 0) +
    (filters.audioLanguage && filters.audioLanguage !== 'all' ? 1 : 0);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(1);
  }

  const handleFilterChange = (newFilters: SearchAnimeFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasSearchOrFilter = !!query || activeCount > 0;

  const { data: searchData, isLoading, isError, refetch } = useQuery({
    queryKey: ['searchPageResults', query, page, filters],
    queryFn: () => jikanService.searchAnime(query, page, 24, filters),
    enabled: hasSearchOrFilter,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
          Pesquisa de Animes
        </h1>
        <SearchBar placeholder="Digite o nome do anime..." />
      </div>

      {/* Advanced Filters Section */}
      <div className="max-w-4xl mx-auto">
        <SearchFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          activeCount={activeCount}
          isOpen={isOpenFilters}
          onToggleOpen={() => setIsOpenFilters((prev) => !prev)}
        />
      </div>

      {hasSearchOrFilter && (
        <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-bold text-white">
              {query ? (
                <>
                  Resultados para &quot;<span className="text-[#FF6B00]">{query}</span>&quot;
                </>
              ) : (
                'Resultados com Filtros Aplicados'
              )}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40">
                {activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}
              </span>
            )}

            {searchData?.pagination?.items?.total !== undefined && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">
                {searchData.pagination.items.total} encontrados
              </span>
            )}

            <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Erro ao carregar dados da busca"
          description="A API do Jikan pode estar temporariamente indisponível devido ao limite de requisições por segundo. Tente novamente em instantes."
          onRetry={refetch}
          retryText="Tentar novamente"
          onAction={handleResetFilters}
          actionText="Limpar Filtros"
        />
      )}

      {/* Content Rendering (Grid vs Compact List) */}
      {!isError && hasSearchOrFilter ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoading
              ? Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)
              : searchData?.data?.map((anime, index) => (
                  <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        ) : (
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                ))
              : searchData?.data?.map((anime, index) => (
                  <CompactAnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        )
      ) : !hasSearchOrFilter ? (
        <EmptyState
          title="Pesquise ou use os Filtros Avançados"
          description="Digite o nome do anime na barra acima ou clique em 'Filtros Avançados' para filtrar por status, nota mínima e gênero."
          actionHref="/populares"
          actionText="Ver Animes Populares"
        />
      ) : null}


      {!isLoading && !isError && hasSearchOrFilter && searchData?.data?.length === 0 && (
        <EmptyState
          title="Nenhum resultado encontrado"
          description={
            query
              ? `Não encontramos nenhum anime correspondente a "${query}" com os filtros selecionados.`
              : 'Nenhum anime encontrado para a combinação de filtros selecionada.'
          }
          onAction={activeCount > 0 ? handleResetFilters : undefined}
          actionText={activeCount > 0 ? 'Limpar Filtros' : undefined}
          actionHref={activeCount === 0 ? '/populares' : undefined}
        />
      )}

      {/* Pagination */}
      {searchData?.pagination?.has_next_page && (
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
            disabled={!searchData.pagination.has_next_page}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              searchData.pagination.has_next_page
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Carregando pesquisa...</div>}>
      <SearchContent />
    </Suspense>
  );
}
