'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Heart, ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { RatingBadge } from './RatingBadge';
import { formatSeasonName } from '@/utils/formatters';
import { useFavorites } from '@/hooks/useFavorites';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from './SafeImage';

interface BannerHeroProps {
  animes: JikanAnime[];
  isLoading?: boolean;
}

export function BannerHero({ animes, isLoading = false }: BannerHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const { isFavorite, toggleFavoriteWithConfirm } = useFavorites();

  useEffect(() => {
    if (!animes || animes.length === 0 || !isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [animes, isAutoplay]);

  const scrollToContent = () => {
    const el = document.getElementById('main-content');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading || !animes || animes.length === 0) {
    return (
      <div className="w-full h-[48vh] sm:h-[54vh] min-h-[360px] sm:min-h-[420px] max-h-[520px] bg-neutral-900/50 animate-pulse relative rounded-b-3xl overflow-hidden flex items-end p-6 md:p-12">
        <div className="max-w-2xl space-y-4">
          <div className="h-6 bg-white/10 rounded w-32" />
          <div className="h-10 bg-white/10 rounded w-3/4" />
          <div className="h-16 bg-white/5 rounded w-full" />
        </div>
      </div>
    );
  }

  const currentAnime = animes[currentIndex];
  const favorited = isFavorite(currentAnime.mal_id);

  const title =
    currentAnime.title_english || currentAnime.title || currentAnime.title_japanese || 'Anime';

  const backdropImage =
    currentAnime.bannerImage ||
    currentAnime.trailer?.images?.maximum_image_url ||
    currentAnime.images?.jpg?.image_url ||
    currentAnime.images?.jpg?.large_image_url;

  const posterImage =
    currentAnime.images?.jpg?.image_url ||
    currentAnime.images?.webp?.image_url ||
    currentAnime.images?.jpg?.large_image_url;

  return (
    <div
      className="relative w-full h-[48vh] sm:h-[54vh] min-h-[360px] sm:min-h-[420px] max-h-[520px] overflow-hidden rounded-b-2xl sm:rounded-b-3xl bg-[#0B0B0F]"
      onMouseEnter={() => setIsAutoplay(false)}
      onMouseLeave={() => setIsAutoplay(true)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAnime.mal_id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <SafeImage
            src={backdropImage}
            fallbackSrc={currentAnime.images?.jpg?.large_image_url || currentAnime.images?.jpg?.image_url}
            animeId={currentAnime.mal_id}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center filter brightness-75 scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent" />

          {/* Hero Content Container */}
          <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex items-end pb-8 sm:pb-10 md:pb-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end w-full">
              {/* Text Info Column */}
              <div className="md:col-span-8 lg:col-span-7 space-y-2.5 sm:space-y-3">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <RatingBadge score={currentAnime.score} size="md" />
                  {currentAnime.season && currentAnime.year && (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-white/10 text-white border border-white/10 text-[11px] sm:text-xs font-semibold backdrop-blur-md">
                      <Calendar size={11} className="text-[#FF6B00]" />
                      {formatSeasonName(currentAnime.season)} {currentAnime.year}
                    </span>
                  )}
                  {currentAnime.type && (
                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 text-[11px] sm:text-xs font-bold">
                      {currentAnime.type}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-lg line-clamp-2">
                  {title}
                </h1>

                {/* Genres */}
                <div className="flex flex-wrap gap-1.5">
                  {currentAnime.genres?.slice(0, 3).map((genre) => (
                    <span
                      key={genre.mal_id}
                      className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] sm:text-xs text-gray-200"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Synopsis */}
                <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 max-w-xl leading-relaxed">
                  {currentAnime.synopsis || 'Sem sinopse disponível.'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                  <Link
                    href={`/anime/${currentAnime.mal_id}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs sm:text-sm transition-all transform hover:scale-105 shadow-xl shadow-[#FF6B00]/30"
                  >
                    <Play size={16} className="fill-current sm:w-4 sm:h-4" />
                    <span>Mais Detalhes</span>
                  </Link>

                  <button
                    onClick={() => toggleFavoriteWithConfirm(currentAnime)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all border ${
                      favorited
                        ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]'
                        : 'bg-white/10 hover:bg-white/20 border-white/15 text-white backdrop-blur-md'
                    }`}
                  >
                    <Heart size={15} className={`sm:w-4 sm:h-4 ${favorited ? 'fill-current' : ''}`} />
                    <span>{favorited ? 'Salvo' : 'Favoritar'}</span>
                  </button>
                </div>
              </div>

              {/* Poster Art Column */}
              <div className="hidden md:flex md:col-span-4 lg:col-span-5 justify-end">
                <div className="relative w-36 lg:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 transform rotate-2 hover:rotate-0 transition-transform duration-500 bg-neutral-900">
                  <SafeImage
                    src={posterImage}
                    fallbackSrc={currentAnime.images?.jpg?.image_url}
                    animeId={currentAnime.mal_id}
                    alt={title}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Smooth Scroll Button to Main Content below */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-[#FF6B00] border border-white/15 hover:border-[#FF6B00] text-gray-300 hover:text-white text-[11px] sm:text-xs font-bold backdrop-blur-md transition-all shadow-xl group cursor-pointer"
        title="Explorar o catálogo completo abaixo"
      >
        <span>Ver Catálogo</span>
        <ChevronDown size={14} className="text-[#FF6B00] group-hover:text-white animate-bounce" />
      </button>

      {/* Manual Slide Controls and Thumbnail Tabs */}
      <div className="absolute top-3 right-3 sm:top-auto sm:bottom-3 sm:right-6 md:right-12 z-20 flex items-center gap-1.5 sm:gap-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 shadow-lg scale-90 sm:scale-100">
        <button
          onClick={() => setCurrentIndex((prev) => (prev === 0 ? animes.length - 1 : prev - 1))}
          className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {animes.map((animeItem, idx) => {
            const isSelected = idx === currentIndex;
            const itemImg = animeItem.images?.jpg?.image_url || animeItem.images?.webp?.image_url;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative rounded-md transition-all overflow-hidden ${
                  isSelected
                    ? 'w-7 sm:w-8 h-4 sm:h-5 ring-2 ring-[#FF6B00] scale-105'
                    : 'w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`Ir para slide ${idx + 1}`}
                title={animeItem.title_english || animeItem.title}
              >
                {isSelected && itemImg && (
                  <SafeImage
                    src={itemImg}
                    animeId={animeItem.mal_id}
                    alt={animeItem.title}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % animes.length)}
          className="p-1 sm:p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
