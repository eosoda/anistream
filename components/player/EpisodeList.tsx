'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Calendar, Film, CheckCircle2, Clock } from 'lucide-react';
import { JikanEpisode } from '@/types/anime';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';
import { Tooltip } from '@/components/ui/Tooltip';

interface EpisodeListProps {
  animeId: number;
  episodes: JikanEpisode[];
  totalEpisodes?: number | null;
  isLoading?: boolean;
}

export function EpisodeList({
  animeId,
  episodes,
  totalEpisodes,
  isLoading = false,
}: EpisodeListProps) {
  const { ref: rangeScrollRef, isDragging: isRangeDragging } = useDraggableScroll<HTMLDivElement>();
  const [searchFilter, setSearchFilter] = useState('');
  const { progressMap } = useWatchProgress();

  // If Jikan returned no episodes, but we know totalEpisodes (or default 12), fallback list
  const effectiveEpisodes: JikanEpisode[] =
    episodes && episodes.length > 0
      ? episodes
      : Array.from({ length: totalEpisodes && totalEpisodes > 0 ? Math.min(totalEpisodes, 100) : 12 }).map(
          (_, i) => ({
            mal_id: i + 1,
            title: `Episódio ${i + 1}`,
          })
        );

  const [activeRange, setActiveRange] = useState(0); // index of range chunk (50 episodes per range)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(effectiveEpisodes.length / CHUNK_SIZE);

  const rangeFilteredEpisodes =
    numChunks > 1
      ? effectiveEpisodes.slice(activeRange * CHUNK_SIZE, (activeRange + 1) * CHUNK_SIZE)
      : effectiveEpisodes;

  const filteredEpisodes = rangeFilteredEpisodes.filter(
    (ep) =>
      ep.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ep.mal_id.toString().includes(searchFilter)
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!effectiveEpisodes || effectiveEpisodes.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl">
        <Film size={36} className="mx-auto text-gray-500 mb-2" />
        <p className="text-gray-300 font-medium">Nenhum episódio cadastrado até o momento.</p>
        <p className="text-xs text-gray-500 mt-1">
          A lista de episódios será atualizada em breve.
        </p>
      </div>
    );
  }

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Search & Range Selector Header */}
      <div className="flex flex-col gap-3 glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-300 font-semibold">
            <Film size={18} className="text-[#FF6B00]" />
            <span>
              Exibindo <strong className="text-white">{filteredEpisodes.length}</strong> de{' '}
              <strong className="text-white">{totalEpisodes || effectiveEpisodes.length}</strong> episódios
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Buscar por nº ou título..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 sm:w-60 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
            />

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <Tooltip content="Visão em Lista" position="bottom">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    viewMode === 'list' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Lista
                </button>
              </Tooltip>

              <Tooltip content="Visão em Grade Compacta" position="bottom">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    viewMode === 'grid' ? 'bg-[#FF6B00] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Grade
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Range Selector Chunks for Long Series (e.g. 1-50, 51-100) */}
        {numChunks > 1 && (
          <div
            ref={rangeScrollRef}
            className={`flex items-center gap-2 overflow-x-auto pt-2 border-t border-white/5 no-scrollbar cursor-grab active:cursor-grabbing select-none ${
              isRangeDragging ? 'scroll-auto' : 'scroll-smooth'
            }`}
          >
            <span className="text-xs text-gray-400 font-bold whitespace-nowrap mr-1">Faixa:</span>
            {Array.from({ length: numChunks }).map((_, idx) => {
              const start = idx * CHUNK_SIZE + 1;
              const end = Math.min((idx + 1) * CHUNK_SIZE, effectiveEpisodes.length);
              const isActive = activeRange === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveRange(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                  }`}
                >
                  {start} - {end}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Episode Grid or List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {filteredEpisodes.map((ep, index) => {
            const progress = progressMap[`${animeId}_ep_${ep.mal_id}`];
            return (
              <Link
                key={`${ep.mal_id}-${index}`}
                href={`/anime/${animeId}/episode/${ep.mal_id}`}
                title={`Episódio ${ep.mal_id}: ${ep.title || 'Assistir'}`}
                className={`group relative aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all ${
                  progress?.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : progress && progress.percentage > 0
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00]/40 text-[#FF6B00]'
                    : 'bg-white/5 border-white/10 text-white hover:border-[#FF6B00] hover:bg-[#FF6B00]/20'
                }`}
              >
                <span className="text-base font-black">Ep {ep.mal_id}</span>
                {progress?.completed ? (
                  <CheckCircle2 size={12} className="mt-1 text-emerald-400" />
                ) : (
                  <Play size={12} className="mt-1 fill-current opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredEpisodes.map((ep, index) => {
            const progress = progressMap[`${animeId}_ep_${ep.mal_id}`];

            return (
              <Link
                key={`${ep.mal_id}-${index}`}
                href={`/anime/${animeId}/episode/${ep.mal_id}`}
                className="group relative overflow-hidden flex items-center justify-between p-3.5 rounded-xl glass-panel glass-panel-hover transition-all border border-white/5 hover:border-[#FF6B00]/40"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors ${
                      progress?.completed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : progress && progress.percentage > 0
                        ? 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30'
                        : 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20 group-hover:bg-[#FF6B00] group-hover:text-white'
                    }`}
                  >
                    {progress?.completed ? <CheckCircle2 size={18} /> : ep.mal_id}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-[#FF6B00] transition-colors truncate">
                      Episódio {ep.mal_id}: {ep.title || 'Sem título'}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                      {ep.aired && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(ep.aired).toLocaleDateString('pt-BR')}
                        </span>
                      )}

                      {progress && !progress.completed && progress.percentage > 0 && (
                        <span className="flex items-center gap-1 text-[#FF6B00] font-bold">
                          <Clock size={10} />
                          {formatSecs(progress.currentTime)} ({progress.percentage}%)
                        </span>
                      )}

                      {progress?.completed && (
                        <span className="text-emerald-400 font-bold">Concluído</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 z-10">
                  {ep.filler && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Filler
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-white/5 text-gray-300 flex items-center justify-center group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
                    <Play size={14} className="fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Progress Bar Line */}
                {progress && !progress.completed && progress.percentage > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-[#FF6B00]"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
