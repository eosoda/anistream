'use client';

import React from 'react';
import { SlidersHorizontal, RotateCcw, Star, Tv, Clock, Check, Sparkles, Languages, Mic, MessageSquare } from 'lucide-react';
import { SearchAnimeFilters } from '@/services/kenjitsu';

interface SearchFiltersProps {
  filters: SearchAnimeFilters;
  onChange: (newFilters: SearchAnimeFilters) => void;
  onReset: () => void;
  activeCount: number;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function SearchFilters({
  filters,
  onChange,
  onReset,
  activeCount,
  isOpen,
  onToggleOpen,
}: SearchFiltersProps) {
  return (
    <div className="w-full space-y-3">
      {/* Bar with toggle button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleOpen}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
            isOpen || activeCount > 0
              ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/30'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>Filtros Avançados</span>
          {activeCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] bg-white text-[#FF6B00] font-extrabold rounded-full">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      {/* Expandable Filter Panel */}
      {isOpen && (
        <div className="p-5 rounded-3xl glass-panel bg-neutral-900/90 border border-white/10 shadow-2xl space-y-6 animate-fade-in">
          {/* Audio & Subtitle Language Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#171322] via-[#12131D] to-[#0D0E15] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-2">
                <Languages size={15} className="text-[#FF6B00]" />
                <span>Legendas e Dublagem em Português (PT-BR)</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                Filtre animes com idioma ou legendas PT-BR
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'Todos os Idiomas', icon: Languages },
                { id: 'subbed_pt', label: '💬 Legendado (PT-BR)', icon: MessageSquare },
                { id: 'dubbed_pt', label: '🎙️ Dublado (PT-BR)', icon: Mic },
                { id: 'pt_br', label: '🇧🇷 Possui PT-BR (Dub/Sub)', icon: Sparkles },
              ].map((opt) => {
                const isSelected = (filters.audioLanguage || 'all') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, audioLanguage: opt.id as any })}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-[#FF6B00]/40 ring-1 ring-white/20'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status de Lançamento */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                <span>Status de Lançamento</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'airing', label: 'Em exibição' },
                  { id: 'complete', label: 'Concluído' },
                  { id: 'upcoming', label: 'A ser lançado' },
                ].map((opt) => {
                  const isSelected = (filters.status || 'all') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ ...filters, status: opt.id as any })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm shadow-[#FF6B00]/40'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nota Mínima */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                <Star size={14} className="fill-[#FF6B00]" />
                <span>Nota Mínima (Score)</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 0, label: 'Qualquer' },
                  { value: 6, label: '6.0+' },
                  { value: 7, label: '7.0+' },
                  { value: 8, label: '8.0+' },
                  { value: 8.5, label: '8.5+' },
                  { value: 9, label: '9.0+' },
                ].map((opt) => {
                  const isSelected = (filters.minScore || 0) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...filters, minScore: opt.value })}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm shadow-[#FF6B00]/40'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                      }`}
                    >
                      {opt.value > 0 && (
                        <Star
                          size={11}
                          className={isSelected ? 'fill-white' : 'fill-amber-400 text-amber-400'}
                        />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipo de Conteúdo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                <Tv size={14} />
                <span>Formato</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'tv', label: 'TV' },
                  { id: 'movie', label: 'Filme' },
                  { id: 'ova', label: 'OVA' },
                  { id: 'special', label: 'Especial' },
                  { id: 'ona', label: 'ONA' },
                ].map((opt) => {
                  const isSelected = (filters.type || 'all') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ ...filters, type: opt.id as any })}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm shadow-[#FF6B00]/40'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ordenação */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Ordenar Por</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'popularity', label: 'Popularidade' },
                  { id: 'score', label: 'Melhor Nota' },
                  { id: 'title', label: 'Título (A-Z)' },
                  { id: 'start_date', label: 'Lançamento' },
                ].map((opt) => {
                  const isSelected = (filters.orderBy || 'popularity') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...filters,
                          orderBy: opt.id as any,
                          sort: opt.id === 'title' ? 'asc' : 'desc',
                        })
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-sm shadow-[#FF6B00]/40'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

