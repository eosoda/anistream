'use client';

import React, { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { kenjitsuService } from '@/services/kenjitsu';
import { SeasonSelector } from '@/components/anime/SeasonSelector';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SeasonName } from '@/types/anime';
import { formatSeasonName } from '@/utils/formatters';
import { getCurrentSeason, getCurrentYear } from '@/utils/season';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';
import { applyCatalogPresentation } from '@/lib/public-experience/catalog';

export default function SeasonsPage() {
  const currentYear = getCurrentYear();
  const { config } = usePublicExperience();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedSeason, setSelectedSeason] = useState<SeasonName>(getCurrentSeason());
  const [page, setPage] = useState(1);

  // Fetch season anime automatically
  const {
    data: seasonData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['seasonAnime', selectedYear, selectedSeason, page, config.catalog.defaultPageSize],
    queryFn: () => kenjitsuService.getSeasonByYearAndSeason(selectedYear, selectedSeason, page, config.catalog.defaultPageSize),
  });

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setPage(1);
  };

  const handleSeasonChange = (season: SeasonName) => {
    setSelectedSeason(season);
    setPage(1);
  };

  const visibleAnime = applyCatalogPresentation(seasonData?.data, config.catalog);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#FF6B00]">
          <Calendar size={24} />
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">{config.catalog.pageHeadings.seasons}</h1>
        </div>
        <p className="text-sm text-gray-400">Navegue pelas safras de lançamentos por ano e estação do ano no Japão.</p>
      </div>

      {/* Season & Year Interactive Selector */}
      <SeasonSelector selectedYear={selectedYear} selectedSeason={selectedSeason} onSelectYear={handleYearChange} onSelectSeason={handleSeasonChange} />

      {/* Results Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl md:text-2xl font-black text-white">
          Lançamentos de{' '}
          <span className="text-[#FF6B00]">
            {formatSeasonName(selectedSeason)} {selectedYear}
          </span>
        </h2>
        {seasonData?.pagination?.items?.total && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">{seasonData.pagination.items.total} animes</span>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Erro ao carregar animes da temporada"
          description="O catalogo Kenjitsu pode estar temporariamente indisponivel. Tente carregar novamente."
          onRetry={refetch}
          retryText="Tentar novamente"
        />
      )}

      {/* Anime Grid */}
      {!isError && (
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
            ? Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : visibleAnime.map((anime, index) => <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />)}
        </div>
      )}

      {!isLoading && !isError && visibleAnime.length === 0 && (
        <EmptyState title="Nenhum anime encontrado para esta temporada" description="Selecione outro ano ou estação para consultar os lançamentos." />
      )}

      {/* Pagination */}
      {seasonData?.pagination?.has_next_page && (
        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              page > 1 ? 'bg-white/10 hover:bg-[#FF6B00] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <span className="text-xs font-bold text-gray-300 px-3 py-1.5 rounded-lg bg-white/5">Página {page}</span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!seasonData.pagination.has_next_page}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              seasonData.pagination.has_next_page ? 'bg-white/10 hover:bg-[#FF6B00] text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
