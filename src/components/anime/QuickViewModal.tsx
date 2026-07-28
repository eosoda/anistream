'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Heart, X, Star, Calendar, Tv, Film, Mic, MessageSquare, Info } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatSeasonName, formatStatus } from '@/utils/formatters';
import { checkPtBrAvailability } from '@/utils/audioFilter';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/context/ToastContext';
import { Share2 } from 'lucide-react';

interface QuickViewModalProps {
  anime: JikanAnime | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ anime, isOpen, onClose }: QuickViewModalProps) {
  const { isFavorite, toggleFavoriteWithConfirm } = useFavorites();
  const { copyToClipboard } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !anime) return null;

  const favorited = isFavorite(anime.mal_id);
  const { hasDub } = checkPtBrAvailability(anime);

  const title = anime.title_english || anime.title || anime.title_japanese || 'Anime';
  const japaneseTitle = anime.title_japanese;

  const backdropImage =
    anime.bannerImage ||
    anime.trailer?.images?.maximum_image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url;

  const posterImage =
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.image_url;

  const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'N/A');

  const handleShare = () => {
    const url = `${window.location.origin}/anime/${anime.mal_id}`;
    copyToClipboard(url, `Link para "${title}" copiado!`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-[#0F0F15] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 my-auto text-white"
        >
          {/* Top Hero Header with Image */}
          <div className="relative w-full h-44 sm:h-56 bg-neutral-900 overflow-hidden">
            <SafeImage
              src={backdropImage}
              fallbackSrc={posterImage}
              animeId={anime.mal_id}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F15] via-[#0F0F15]/40 to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black text-gray-300 hover:text-white border border-white/15 backdrop-blur-md transition-all shadow-lg"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>

            {/* Badges on hero */}
            <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
              <RatingBadge score={anime.score} size="md" />
              {hasDub ? (
                <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white font-black text-[10px] border border-purple-400/30 flex items-center gap-1 shadow-md">
                  <Mic size={11} /> DUB BR
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white font-black text-[10px] border border-emerald-400/30 flex items-center gap-1 shadow-md">
                  <MessageSquare size={11} /> LEG PT
                </span>
              )}
            </div>

            {/* Title Overlay over backdrop */}
            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-end gap-3 sm:gap-4">
              <div className="relative w-20 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/15 bg-neutral-900 flex-shrink-0 -mb-6 sm:-mb-8 hidden sm:block">
                <SafeImage
                  src={posterImage}
                  animeId={anime.mal_id}
                  alt={title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>

              <div className="flex-grow min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                  {title}
                </h2>
                {japaneseTitle && japaneseTitle !== title && (
                  <p className="text-xs text-gray-400 font-medium truncate mt-0.5">{japaneseTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-4 sm:p-6 pt-6 sm:pt-10 space-y-4">
            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <Tv size={12} className="text-[#FF6B00]" />
                {anime.type || 'TV'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <Calendar size={12} className="text-[#FF6B00]" />
                {year}
              </span>

              {anime.episodes && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <Film size={12} className="text-[#FF6B00]" />
                  {anime.episodes} eps
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 font-bold">
                {formatStatus(anime.status)}
              </span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5">
              {anime.genres?.map((genre) => (
                <span
                  key={genre.mal_id}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] text-gray-200 font-medium"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
                <Info size={14} />
                <span>Sinopse</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-h-36 sm:max-h-44 overflow-y-auto pr-1 no-scrollbar">
                {anime.synopsis || 'Nenhuma sinopse em português informada para este anime.'}
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <Link
                href={`/anime/${anime.mal_id}`}
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs sm:text-sm transition-all transform hover:scale-102 shadow-xl shadow-[#FF6B00]/30"
              >
                <Play size={16} className="fill-current" />
                <span>Ver Episódios</span>
              </Link>

              <button
                onClick={() => toggleFavoriteWithConfirm(anime)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all border ${
                  favorited
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00]'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                }`}
              >
                <Heart size={16} className={favorited ? 'fill-current' : ''} />
                <span>{favorited ? 'Salvo' : 'Favoritar'}</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-gray-300 hover:text-white transition-all"
                title="Compartilhar Link"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

