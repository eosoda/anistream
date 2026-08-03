'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { SeasonSelector } from '@/components/anime/SeasonSelector';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SeasonName } from '@/types/anime';
import { formatSeasonName } from '@/utils/formatters';

export default function SeasonsPage() {
  const currentYear = 2024;
  const getCurrentSeason = (): SeasonName => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 3) return 'winter';
    if (month >= 4 && month <= 6) return 'spring';
    if (month >= 7 && month <= 9) return 'summer';
    return 'fall';
  };

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedSeason, setSelectedSeason] = useState<SeasonName>(getCurrentSeason());
  const [page, setPage] = useState(1);

  // Fetch season anime automatically
  const { data: seasonData, isLoading, isError, refetch } = useQuery({
    queryKey: ['seasonAnime', selectedYear, selectedSeason, page],
    queryFn: () => jikanService.getSeasonByYearAndSeason(selectedYear, selectedSeason, page, 24),
  });

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setPage(1);
  };

  const handleSeasonChange = (season: SeasonName) => {
    setSelectedSeason(season);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#FF6B00]">
          <Calendar size={24} />
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            Animes de Temporada
          </h1>
        </div>
        <p className="text-sm text-gray-400">
          Navegue pelas safras de lançamentos por ano e estação do ano no Japão.
        </p>
      </div>

      {/* Season & Year Interactive Selector */}
      <SeasonSelector
        selectedYear={selectedYear}
        selectedSeason={selectedSeason}
        onSelectYear={handleYearChange}
        onSelectSeason={handleSeasonChange}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl md:text-2xl font-black text-white">
          Lançamentos de{' '}
          <span className="text-[#FF6B00]">
            {formatSeasonName(selectedSeason)} {selectedYear}
          </span>
        </h2>
        {seasonData?.pagination?.items?.total && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">
            {seasonData.pagination.items.total} animes
          </span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : seasonData?.data?.map((anime, index) => <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />)}
        </div>
      )}

      {!isLoading && !isError && (!seasonData?.data || seasonData.data.length === 0) && (
        <EmptyState
          title="Nenhum anime encontrado para esta temporada"
          description="Selecione outro ano ou estação para consultar os lançamentos."
        />
      )}

      {/* Pagination */}
      {seasonData?.pagination?.has_next_page && (
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
            disabled={!seasonData.pagination.has_next_page}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${
              seasonData.pagination.has_next_page
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
