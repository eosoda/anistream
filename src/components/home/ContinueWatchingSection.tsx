'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Clock, ChevronRight, Trash2 } from 'lucide-react';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';
import { SafeImage } from '@/components/ui/SafeImage';
import { Tooltip } from '@/components/ui/Tooltip';

export function ContinueWatchingSection() {
  const { getContinueWatchingList, removeProgress } = useWatchProgress();
  const { confirm } = useConfirmation();
  const { ref: scrollRef, isDragging } = useDraggableScroll<HTMLDivElement>();
  const continueList = getContinueWatchingList();

  if (continueList.length === 0) return null;

  const handleRemoveItem = async (animeId: number, episodeNum: number, animeTitle: string, animeImage?: string) => {
    const confirmed = await confirm({
      title: 'Remover do Histórico?',
      description: `Tem certeza que deseja remover o progresso do Episódio ${episodeNum} de "${animeTitle}"?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
      animeTitle,
      animeImage,
      animeId,
    });

    if (confirmed) {
      removeProgress(animeId, episodeNum);
    }
  };

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
          <span className="w-2 h-7 bg-[#FF6B00] rounded-full inline-block" />
          Continuar Assistindo
        </h2>

        <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          {continueList.length} {continueList.length === 1 ? 'episódio em andamento' : 'episódios em andamento'}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto no-scrollbar touch-pan-x py-2 px-1 cursor-grab active:cursor-grabbing select-none ${
          isDragging ? 'scroll-auto' : 'scroll-smooth'
        }`}
      >
        {continueList.map((item) => (
          <div
            key={`${item.animeId}_ep_${item.episodeNum}`}
            className="w-[260px] sm:w-[300px] flex-shrink-0 group relative glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-[#FF6B00]/50 transition-all flex flex-col justify-between"
          >
            {/* Cover & Overlay */}
            <div className="relative h-36 w-full bg-neutral-900 overflow-hidden">
              <SafeImage
                src={item.animeImage}
                animeId={item.animeId}
                alt={item.animeTitle}
                fill
                sizes="300px"
                className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-80 pointer-events-none"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent pointer-events-none" />

              {/* Episode Tag */}
              <div className="absolute top-3 left-3 bg-[#FF6B00] text-white px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-md">
                Episódio {item.episodeNum}
              </div>

              {/* Remove progress button */}
              <div className="absolute top-3 right-3 z-20">
                <Tooltip content="Remover do histórico" position="left">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveItem(item.animeId, item.episodeNum, item.animeTitle, item.animeImage);
                    }}
                    aria-label="Remover do histórico"
                    className="grid size-10 place-items-center rounded-lg bg-black/70 text-white/80 opacity-0 transition-[opacity,background-color] hover:bg-red-600 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>

              {/* Center Play Icon */}
              <Link
                href={`/anime/${item.animeId}/episode/${item.episodeNum}`}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg shadow-[#FF6B00]/40 transform group-hover:scale-110 transition-transform">
                  <Play size={20} className="fill-current ml-0.5" />
                </div>
              </Link>

              {/* Progress bar overlay at bottom of image */}
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20 pointer-events-none">
                <div
                  className="h-full bg-[#FF6B00]"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>

            {/* Title & Info */}
            <div className="p-4 space-y-2 bg-neutral-950/80">
              <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-[#FF6B00] transition-colors">
                {item.animeTitle}
              </h3>

              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                <span className="flex items-center gap-1 text-[#FF6B00]">
                  <Clock size={12} />
                  Parou em {formatSecs(item.currentTime)} ({item.percentage}%)
                </span>

                <Link
                  href={`/anime/${item.animeId}/episode/${item.episodeNum}`}
                  className="text-white hover:text-[#FF6B00] flex items-center gap-0.5 transition-colors"
                >
                  Continuar
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
