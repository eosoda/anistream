'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { AnimeCard } from './AnimeCard';
import { AnimeCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

interface AnimeCarouselProps {
  title: string;
  icon?: React.ReactNode;
  animes: JikanAnime[];
  isLoading?: boolean;
  viewAllHref?: string;
  subtitle?: string;
}

export function AnimeCarousel({
  title,
  icon,
  animes,
  isLoading = false,
  viewAllHref,
  subtitle,
}: AnimeCarouselProps) {
  const {
    ref: scrollContainerRef,
    elementRef: scrollContainerElementRef,
    isDragging,
  } = useDraggableScroll<HTMLDivElement>();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    let frameId = 0;
    const checkScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (!scrollContainerElementRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerElementRef.current;
        setCanScrollLeft(scrollLeft > 10);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
      });
    };

    checkScroll();
    const currentRef = scrollContainerElementRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
      cancelAnimationFrame(frameId);
    };
  }, [animes, isLoading, scrollContainerElementRef]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerElementRef.current) return;
    const { clientWidth } = scrollContainerElementRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollContainerElementRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="w-full my-8 px-4 md:px-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="text-[#FF6B00]">{icon}</span>
            ) : (
              <Sparkles className="text-[#FF6B00]" size={20} />
            )}
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-[#FF6B00] hover:text-[#FF8533] hover:underline mr-2"
            >
              Ver todos →
            </Link>
          )}

          {/* Navigation controls */}
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Anterior"
            className={`p-2 rounded-full border border-white/10 transition-all ${
              canScrollLeft
                ? 'bg-white/10 hover:bg-[#FF6B00] text-white hover:border-[#FF6B00]'
                : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Próximo"
            className={`p-2 rounded-full border border-white/10 transition-all ${
              canScrollRight
                ? 'bg-white/10 hover:bg-[#FF6B00] text-white hover:border-[#FF6B00]'
                : 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Track */}
      <div
        ref={scrollContainerRef}
        className={`flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar touch-pan-y py-2 px-1 cursor-grab active:cursor-grabbing select-none overscroll-x-contain ${
          isDragging ? 'scroll-auto snap-none' : 'scroll-smooth snap-x snap-mandatory'
        }`}
      >
        {!isLoading && (!animes || animes.length === 0) ? (
          <div className="w-full py-8 text-center glass-panel rounded-2xl border border-white/5 text-gray-400 text-xs font-semibold">
            Nenhum anime disponível nesta categoria no momento.
          </div>
        ) : isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[145px] min-[560px]:w-[170px] sm:w-[185px] md:w-[205px] flex-shrink-0 snap-start">
              <AnimeCardSkeleton />
            </div>
          ))
        ) : (
          animes?.map((anime, index) => (
            <div
              key={`${anime.mal_id}-${index}`}
              className="w-[145px] min-[560px]:w-[170px] sm:w-[185px] md:w-[205px] flex-shrink-0 snap-start"
            >
              <AnimeCard anime={anime} index={index} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
