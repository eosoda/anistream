'use client';

import React from 'react';
import { Filter, RotateCcw, Flame, Sparkles, Clock, Check } from 'lucide-react';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

export interface QuickFilterState {
  genre?: string;
  status?: 'all' | 'airing' | 'complete';
  orderBy?: 'popularity' | 'start_date' | 'score' | 'title';
}

interface QuickMultiFilterProps {
  filters: QuickFilterState;
  onChange: (newFilters: QuickFilterState) => void;
  onReset?: () => void;
}

export const GENRE_MAL_ID_MAP: Record<string, string> = {
  acao: '1',
  aventura: '2',
  comedia: '4',
  drama: '8',
  fantasia: '10',
  romance: '22',
  'sci-fi': '24',
  slice: '36',
  sobrenatural: '37',
  suspense: '41',
  isekai: '62',
};

const POPULAR_GENRES = [
  { id: 'all', label: 'Todos os Gêneros' },
  { id: 'acao', label: '⚔️ Ação' },
  { id: 'aventura', label: '🧭 Aventura' },
  { id: 'comedia', label: '😂 Comédia' },
  { id: 'drama', label: '🎭 Drama' },
  { id: 'fantasia', label: '🧙‍♂️ Fantasia' },
  { id: 'isekai', label: '🌀 Isekai' },
  { id: 'romance', label: '❤️ Romance' },
  { id: 'sci-fi', label: '🚀 Sci-Fi' },
  { id: 'slice', label: '☕ Slice of Life' },
  { id: 'suspense', label: '👁️ Suspense' },
  { id: 'sobrenatural', label: '👻 Sobrenatural' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'Todos os Status' },
  { id: 'airing', label: '🔴 Em Exibição' },
  { id: 'complete', label: '✅ Finalizado' },
];

const SORT_OPTIONS = [
  { id: 'popularity', label: '🔥 Mais Populares' },
  { id: 'score', label: '⭐ Melhor Avaliados' },
  { id: 'start_date', label: '📅 Mais Recentes' },
];

export function QuickMultiFilter({ filters, onChange, onReset }: QuickMultiFilterProps) {
  const { ref: genresScrollRef, isDragging: isGenresDragging } = useDraggableScroll<HTMLDivElement>();

  const activeCount =
    (filters.genre && filters.genre !== 'all' ? 1 : 0) +
    (filters.status && filters.status !== 'all' ? 1 : 0) +
    (filters.orderBy && filters.orderBy !== 'popularity' ? 1 : 0);

  return (
    <div className="w-full p-4 rounded-3xl glass-panel bg-neutral-900/80 border border-white/10 space-y-3.5 shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF6B00]">
          <Filter size={15} />
          <span>Filtro Combinado Rápido</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#FF6B00] text-[#170a02] text-[10px] font-extrabold shadow-sm">
              {activeCount} ativo{activeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeCount > 0 && onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white hover:underline transition-colors"
          >
            <RotateCcw size={12} />
            <span>Resetar</span>
          </button>
        )}
      </div>

      {/* Row 1: Genres Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Gênero:</span>
        <div
          ref={genresScrollRef}
          className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none ${
            isGenresDragging ? 'scroll-auto' : 'scroll-smooth'
          }`}
        >
          {POPULAR_GENRES.map((g) => {
            const isSelected = (filters.genre || 'all') === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onChange({ ...filters, genre: g.id })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#FF6B00] text-[#170a02] border-[#FF6B00] shadow-md shadow-[#FF6B00]/30 scale-102'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 hover:border-white/20'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Status & Sorting Chips side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
        {/* Status */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} className="text-[#FF6B00]" />
            Status:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((st) => {
              const isSelected = (filters.status || 'all') === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => onChange({ ...filters, status: st.id as any })}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                    isSelected
                      ? 'bg-[#FF6B00] text-[#170a02] border-[#FF6B00] shadow-md shadow-[#FF6B00]/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="text-[#FF6B00]" />
            Ordenação:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SORT_OPTIONS.map((so) => {
              const isSelected = (filters.orderBy || 'popularity') === so.id;
              return (
                <button
                  key={so.id}
                  onClick={() => onChange({ ...filters, orderBy: so.id as any })}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                    isSelected
                      ? 'bg-[#FF6B00] text-[#170a02] border-[#FF6B00] shadow-md shadow-[#FF6B00]/30'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                  }`}
                >
                  {so.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
