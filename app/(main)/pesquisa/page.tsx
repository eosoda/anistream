'use client';

import React, { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { searchAvailableAnime, type LocalAnimeSearchFilters } from '@/services/localAnimeSearch';
import { localSearchItemToAnime } from '@/types/local-search';
import { SearchBar } from '@/components/catalog/SearchBar';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { CompactAnimeCard } from '@/components/anime/CompactAnimeCard';
import { ViewToggle, ViewMode } from '@/components/catalog/ViewToggle';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';
import { applyCatalogPresentation } from '@/lib/public-experience/catalog';

function SearchResults({ query, filters }: { query: string; filters: LocalAnimeSearchFilters }) {
  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== '');
  const hasSearch = query.length > 0 || hasFilters;
  const { config } = usePublicExperience();
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('anistream_view_mode');
    return stored === 'list' ? 'list' : 'grid';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('anistream_view_mode', mode);
  };

  const {
    data: searchData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['availableAnimeSearch', query, filters, page, config.catalog.defaultPageSize],
    queryFn: ({ signal }) => searchAvailableAnime(query, page, config.catalog.defaultPageSize, signal, filters),
    enabled: hasSearch,
  });
  const animes = useMemo(() => searchData?.data.map(localSearchItemToAnime) || [], [searchData]);
  const visibleAnimes = applyCatalogPresentation(animes, config.catalog);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">{config.catalog.pageHeadings.search}</h1>
        <p className="text-sm text-gray-400">Encontre títulos disponíveis para assistir no AniStream.</p>
        <SearchBar placeholder="Digite o nome do anime..." initialQuery={query} />
      </div>

      {hasSearch && (
        <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg md:text-xl font-bold text-white">
            {query ? (
              <>
                Resultados para &quot;<span className="text-[#FF6B00]">{query}</span>&quot;
              </>
            ) : (
              'Resultados filtrados'
            )}
          </h2>
          <div className="flex items-center gap-3">
            {searchData && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">{searchData.pagination.totalItems} encontrados</span>
            )}
            <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
          </div>
        </div>
      )}

      {isError && (
        <EmptyState
          title="Erro ao buscar animes"
          description="Não foi possível consultar o catálogo local. Tente novamente."
          onRetry={refetch}
          retryText="Tentar novamente"
        />
      )}

      {!isError && hasSearch ? (
        viewMode === 'grid' ? (
          <div
            className="catalog-grid"
            style={
              {
                '--catalog-columns-mobile': config.catalog.columns.mobile,
                '--catalog-columns-tablet': config.catalog.columns.tablet,
                '--catalog-columns-desktop': config.catalog.columns.desktop,
              } as CSSProperties
            }
            aria-busy={isLoading || isFetching}
          >
            {isLoading
              ? Array.from({ length: 12 }).map((_, index) => <AnimeCardSkeleton key={index} />)
              : visibleAnimes.map((anime, index) => <AnimeCard key={anime.mal_id} anime={anime} index={index} />)}
          </div>
        ) : (
          <div className="space-y-2" aria-busy={isLoading || isFetching}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
              : visibleAnimes.map((anime, index) => <CompactAnimeCard key={anime.mal_id} anime={anime} index={index} />)}
          </div>
        )
      ) : !hasSearch ? (
        <EmptyState
          title="Pesquise um anime disponível"
          description="Digite pelo menos parte do título para pesquisar no catálogo do AniStream."
          actionHref="/populares"
          actionText="Ver Animes Populares"
        />
      ) : null}

      {!isLoading && !isError && hasSearch && visibleAnimes.length === 0 && (
        <EmptyState
          title="Nenhum anime disponível encontrado"
          description={`Não encontramos um título disponível correspondente a "${query}".`}
          actionHref="/populares"
          actionText="Ver Animes Populares"
        />
      )}

      {searchData && searchData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
            disabled={!searchData.pagination.hasPreviousPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-white/10 enabled:hover:bg-[#FF6B00] text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-xs font-bold text-gray-300 px-3 py-1.5 rounded-lg bg-white/5">
            Página {searchData.pagination.currentPage} de {searchData.pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((value) => value + 1)}
            disabled={!searchData.pagination.hasNextPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-white/10 enabled:hover:bg-[#FF6B00] text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const filters: LocalAnimeSearchFilters = {
    status: (searchParams.get('status') as LocalAnimeSearchFilters['status']) || undefined,
    orderBy: (searchParams.get('orderBy') as LocalAnimeSearchFilters['orderBy']) || undefined,
    genres: searchParams.get('genres') || undefined,
  };
  return <SearchResults key={`${query}:${JSON.stringify(filters)}`} query={query} filters={filters} />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Carregando pesquisa...</div>}>
      <SearchContent />
    </Suspense>
  );
}
