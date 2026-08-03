'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ListFilter,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Type,
  Filter,
} from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { CompactAnimeCard } from '@/components/anime/CompactAnimeCard';
import { ViewToggle, ViewMode } from '@/components/catalog/ViewToggle';
import { QuickMultiFilter, QuickFilterState, GENRE_MAL_ID_MAP } from '@/components/catalog/QuickMultiFilter';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

const ALPHABET = [
  'Todos',
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

const DEFAULT_QUICK_FILTERS: QuickFilterState = {
  genre: 'all',
  status: 'all',
  orderBy: 'popularity',
};

export default function AnimeListPage() {
  const { ref: alphabetScrollRef, isDragging: isAlphabetDragging } = useDraggableScroll<HTMLDivElement>();
  const [selectedLetter, setSelectedLetter] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'tv' | 'movie' | 'ova' | 'ona'>('all');
  const [quickFilters, setQuickFilters] = useState<QuickFilterState>(DEFAULT_QUICK_FILTERS);

  // Persistent view mode state (grid vs compact list)
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

  // Fetch anime in alphabetical/symbol order + combined filters
  const { data: animeListData, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'animeListAlphabetical',
      selectedLetter,
      searchQuery,
      page,
      typeFilter,
      quickFilters,
    ],
    queryFn: () =>
      jikanService.searchAnime(searchQuery, page, 24, {
        orderBy: quickFilters.orderBy || 'title',
        sort: quickFilters.orderBy === 'title' ? 'asc' : 'desc',
        letter:
          selectedLetter !== 'Todos'
            ? selectedLetter === '#'
              ? '#'
              : selectedLetter.toLowerCase()
            : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: quickFilters.status !== 'all' ? quickFilters.status : undefined,
        genres: quickFilters.genre && quickFilters.genre !== 'all' ? GENRE_MAL_ID_MAP[quickFilters.genre] : undefined,
      }),
  });

  const handleLetterSelect = (letter: string) => {
    setSelectedLetter(letter);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleQuickFilterChange = (newFilters: QuickFilterState) => {
    setQuickFilters(newFilters);
    setPage(1);
  };

  const handleResetQuickFilters = () => {
    setQuickFilters(DEFAULT_QUICK_FILTERS);
    setPage(1);
  };

  const pagination = animeListData?.pagination;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131E3A] to-[#0D111E] border border-blue-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <ListFilter size={14} />
            Diretório Completo
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Lista de <span className="text-[#FF6B00]">Animes</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Navegue por todo o acervo. Combine filtros rápidos, formato, ordem alfabética (A-Z) e alterne entre a visão em Grade ou Lista Compacta.
          </p>
        </div>
      </div>

      {/* Quick Multi-Filter Chips */}
      <QuickMultiFilter
        filters={quickFilters}
        onChange={handleQuickFilterChange}
        onReset={handleResetQuickFilters}
      />

      {/* Dynamic Search Box & Type Filter & View Toggle Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Dynamic Search Bar */}
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Buscar título na lista alfabética..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Type Selector */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-transparent text-white text-xs font-bold px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#12131C]">Todos os Formatos</option>
              <option value="tv" className="bg-[#12131C]">Séries de TV</option>
              <option value="movie" className="bg-[#12131C]">Filmes</option>
              <option value="ova" className="bg-[#12131C]">OVAs</option>
              <option value="ona" className="bg-[#12131C]">ONAs / Web</option>
            </select>
          </div>

          {/* View Toggle (Grid vs Compact List) */}
          <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
        </div>

        {/* Alphabet Selector Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Type size={14} className="text-[#FF6B00]" />
              Filtrar por Inicial / Símbolo (# - Z)
            </span>
            {selectedLetter !== 'Todos' && (
              <button
                onClick={() => handleLetterSelect('Todos')}
                className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
              >
                Resetar Filtro
              </button>
            )}
          </div>

          <div
            ref={alphabetScrollRef}
            className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 cursor-grab active:cursor-grabbing select-none ${
              isAlphabetDragging ? 'scroll-auto' : 'scroll-smooth'
            }`}
          >
            {ALPHABET.map((letter) => {
              const isSelected = selectedLetter === letter;
              return (
                <button
                  key={letter}
                  onClick={() => handleLetterSelect(letter)}
                  className={`flex-shrink-0 min-w-[36px] h-9 px-2.5 rounded-xl font-extrabold text-xs transition-all ${
                    isSelected
                      ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5'
                  }`}
                  title={letter === '#' ? 'Símbolos e Números' : `Letra ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400 border-b border-white/10 pb-3">
        <span className="font-semibold">
          {selectedLetter !== 'Todos' ? (
            <>
              {selectedLetter === '#' ? (
                <>
                  Animes iniciados com <span className="text-[#FF6B00] font-black text-base ml-1">Símbolos e Números (#)</span>
                </>
              ) : (
                <>
                  Animes iniciados com a letra <span className="text-[#FF6B00] font-black uppercase text-base ml-1">&quot;{selectedLetter}&quot;</span>
                </>
              )}
            </>
          ) : searchQuery ? (
            <>
              Resultados para <span className="text-white font-bold">&quot;{searchQuery}&quot;</span>
            </>
          ) : (
            'Lista Completa de Animes'
          )}
        </span>

        {animeListData?.pagination?.items?.total !== undefined && (
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
            {animeListData.pagination.items.total} títulos
          </span>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <EmptyState
          title="Erro ao carregar lista de animes"
          description="Falha ao sincronizar com o catalogo Kenjitsu. Tente novamente."
          onRetry={refetch}
          retryText="Tentar novamente"
        />
      )}

      {/* Content Rendering: Grid vs Compact List */}
      {!isError && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoading
              ? Array.from({ length: 24 }).map((_, i) => <AnimeCardSkeleton key={i} />)
              : animeListData?.data?.map((anime, index) => (
                  <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        ) : (
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                ))
              : animeListData?.data?.map((anime, index) => (
                  <CompactAnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
                ))}
          </div>
        )
      )}


      {/* Empty State */}
      {!isLoading && !isError && animeListData?.data?.length === 0 && (
        <EmptyState
          icon={<ListFilter size={32} />}
          title="Nenhum anime encontrado"
          description={
            selectedLetter !== 'Todos'
              ? `Nenhum anime encontrado iniciando com a letra "${selectedLetter}".`
              : 'Nenhum resultado encontrado para a busca ou filtros atuais.'
          }
          onAction={() => {
            setSelectedLetter('Todos');
            handleClearSearch();
          }}
          actionText="Ver Todos os Animes"
        />
      )}

      {/* Pagination */}
      {!isLoading && !isError && animeListData?.data && animeListData.data.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-white/10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-extrabold text-white">
            Página {page}
          </div>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination?.has_next_page}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Próxima
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
