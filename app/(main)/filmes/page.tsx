'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Film,
  Search,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clapperboard,
  SlidersHorizontal,
} from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { AnimeCard } from '@/components/anime/AnimeCard';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FilmesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'airing' | 'complete' | 'upcoming'>('all');
  const [orderBy, setOrderBy] = useState<'score' | 'popularity' | 'title' | 'start_date'>('popularity');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const { data: moviesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['moviesList', searchQuery, page, statusFilter, orderBy, sortDir],
    queryFn: () =>
      jikanService.searchAnime(searchQuery, page, 24, {
        type: 'movie',
        status: statusFilter,
        orderBy,
        sort: sortDir,
      }),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const pagination = moviesData?.pagination;
  const totalPages = pagination?.last_visible_page || (pagination?.has_next_page ? page + 1 : page);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[var(--radius-media)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 sm:p-10">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#FF6B00]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FF8533]">
            <Clapperboard size={14} />
            Catálogo Cinematográfico
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Filmes de <span className="text-[#FF6B00]">Anime</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Explore longas-metragens, animações premiadas e filmes das suas franquias de anime favoritas.
          </p>
        </div>
      </div>

      {/* Dynamic Search & Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Dynamic Search Box for Movies */}
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Pesquisar especificamente por filmes de anime..."
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-400 text-xs sm:text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
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

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all ${
              showFilters || statusFilter !== 'all' || orderBy !== 'popularity'
                ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-[#FF6B00]/30'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={18} />
            <span>Filtros</span>
          </button>
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="p-5 rounded-2xl bg-[#12131C] border border-white/10 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label htmlFor="movie-status" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                <select id="movie-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-[#FF6B00]"
                >
                  <option value="all" className="bg-[#12131C]">Todos os Status</option>
                  <option value="complete" className="bg-[#12131C]">Lançado / Concluído</option>
                  <option value="airing" className="bg-[#12131C]">Em Exibição</option>
                  <option value="upcoming" className="bg-[#12131C]">Anunciado / Em Breve</option>
                </select>
              </div>

              {/* Order By */}
              <div className="space-y-1.5">
                <label htmlFor="movie-sort" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordenar Por</label>
                <select id="movie-sort"
                  value={orderBy}
                  onChange={(e) => {
                    setOrderBy(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-[#FF6B00]"
                >
                  <option value="popularity" className="bg-[#12131C]">Mais Populares</option>
                  <option value="score" className="bg-[#12131C]">Melhores Notas</option>
                  <option value="title" className="bg-[#12131C]">Título</option>
                  <option value="start_date" className="bg-[#12131C]">Data de Lançamento</option>
                </select>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <label htmlFor="movie-order" className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordem</label>
                <select id="movie-order"
                  value={sortDir}
                  onChange={(e) => {
                    setSortDir(e.target.value as any);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-[#FF6B00]"
                >
                  <option value="desc" className="bg-[#12131C]">Decrescente</option>
                  <option value="asc" className="bg-[#12131C]">Crescente</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Title Info */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400 border-b border-white/10 pb-3">
        <span className="font-semibold">
          {searchQuery ? (
            <>
              Filmes encontrados para <span className="text-white font-bold">&quot;{searchQuery}&quot;</span>
            </>
          ) : (
            'Catálogo de Filmes de Anime'
          )}
        </span>
        {moviesData?.pagination?.items?.total !== undefined && (
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300">
            {moviesData.pagination.items.total} filmes
          </span>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <EmptyState
          title="Erro ao carregar lista de filmes"
          description="Ocorreu um problema ao conectar com o catalogo Kenjitsu. Tente novamente."
          onRetry={refetch}
          retryText="Tentar novamente"
        />
      )}

      {/* Movies Grid */}
      {!isError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            : moviesData?.data?.map((anime, index) => (
                <AnimeCard key={`${anime.mal_id}-${index}`} anime={anime} index={index} />
              ))}
        </div>
      )}

      {/* Empty State when no results */}
      {!isLoading && !isError && moviesData?.data?.length === 0 && (
        <EmptyState
          icon={<Film size={32} />}
          title="Nenhum filme encontrado"
          description={
            searchQuery
              ? `Não encontramos nenhum filme de anime correspondente a "${searchQuery}".`
              : 'Nenhum filme disponível para os filtros selecionados.'
          }
          onAction={searchQuery ? handleClearSearch : undefined}
          actionText={searchQuery ? 'Limpar Pesquisa' : undefined}
        />
      )}

      {/* Pagination */}
      {!isLoading && !isError && moviesData?.data && moviesData.data.length > 0 && (
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
