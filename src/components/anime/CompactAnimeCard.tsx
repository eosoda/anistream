'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Play, Heart, Star, Tv, Eye, Mic, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { SafeImage } from '@/components/ui/SafeImage';
import { checkPtBrAvailability } from '@/utils/audioFilter';
import { Tooltip } from '@/components/ui/Tooltip';
import { QuickViewModal } from './QuickViewModal';
import { formatStatus } from '@/utils/formatters';

interface CompactAnimeCardProps {
  anime: JikanAnime;
  index?: number;
}

export function CompactAnimeCard({ anime, index }: CompactAnimeCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const { isFavorite, toggleFavoriteWithConfirm, newEpisodesMap, markAsSeen } = useFavorites();
  const { getAnimeOverallProgress } = useWatchProgress();

  const favorited = isFavorite(anime.mal_id);
  const overallProgress = getAnimeOverallProgress(anime.mal_id, anime.episodes);

  const epInfo = favorited ? newEpisodesMap[anime.mal_id] : undefined;
  const hasNewEpisode = epInfo?.hasNewEpisode;

  const { hasDub } = checkPtBrAvailability(anime);

  const imageUrl =
    anime.images?.jpg?.small_image_url ||
    anime.images?.jpg?.image_url ||
    anime.images?.webp?.image_url;

  const title = anime.title || anime.title_english || anime.title_japanese || 'Sem título';
  const typeStr = anime.type || 'TV';
  const episodesCount = anime.episodes ? `${anime.episodes} eps` : 'Em lançamento';
  const yearStr = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'N/A');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index !== undefined ? Math.min((index % 12) * 0.03, 0.3) : 0,
        ease: 'easeOut',
      }}
      className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl glass-panel glass-panel-hover border transition-all duration-200 ${
        hasNewEpisode
          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
          : 'border-white/10 hover:border-[#FF6B00]/40'
      }`}
    >
      {/* Left Section: Thumbnail & Main Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
        {/* Cover Thumbnail */}
        <Link
          href={`/anime/${anime.mal_id}`}
          className="relative w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 border border-white/10 group-hover:border-[#FF6B00]/50 transition-colors"
        >
          <SafeImage
            src={imageUrl}
            animeId={anime.mal_id}
            alt={title}
            fill
            sizes="56px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {favorited && (
            <span className="absolute top-1 right-1 p-1 rounded-full bg-[#FF6B00] text-white shadow-md z-10">
              <Heart size={9} className="fill-current" />
            </span>
          )}
        </Link>

        {/* Text & Meta Information */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/anime/${anime.mal_id}`}
              className="font-black text-xs sm:text-sm text-white group-hover:text-[#FF6B00] transition-colors truncate max-w-md"
              title={title}
            >
              {title}
            </Link>

            {hasNewEpisode && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white animate-pulse flex-shrink-0">
                NOVO EP
              </span>
            )}
          </div>

          {/* Sub-row: Rating, Year, Type, Episodes, Status, Audio Badges */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
            {anime.score && (
              <span className="flex items-center gap-0.5 text-amber-400 font-extrabold bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                <Star size={11} className="fill-current" />
                {anime.score.toFixed(1)}
              </span>
            )}

            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-semibold text-gray-300">
              {typeStr}
            </span>

            <span>•</span>
            <span className="font-semibold text-gray-300">{yearStr}</span>

            <span>•</span>
            <span className="text-gray-400">{episodesCount}</span>

            <span>•</span>
            <span className="text-gray-300 font-medium">{formatStatus(anime.status)}</span>

            {hasDub ? (
              <span className="px-1.5 py-0.5 rounded bg-purple-600/80 text-white font-extrabold text-[9px] border border-purple-400/30">
                DUB
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white font-extrabold text-[9px] border border-emerald-400/30">
                LEG
              </span>
            )}
          </div>

          {/* Genre Chips (desktop/tablet) */}
          <div className="hidden md:flex items-center gap-1 pt-0.5">
            {anime.genres?.slice(0, 3).map((genre) => (
              <span
                key={genre.mal_id}
                className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full"
              >
                {genre.name}
              </span>
            ))}
          </div>

          {/* Watch Progress Indicator */}
          {overallProgress && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold pt-0.5">
              <span>
                {overallProgress.percentage !== null
                  ? `${overallProgress.percentage}% assistido (${overallProgress.watchedEpCount}/${overallProgress.totalEpisodes} eps)`
                  : `${overallProgress.watchedEpCount} ep(s) assistidos`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 z-10">
        {hasNewEpisode && (
          <Tooltip content="Marcar novo episódio como visto" position="top">
            <button
              onClick={(e) => {
                e.preventDefault();
                markAsSeen(anime.mal_id);
              }}
              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors shadow-sm"
            >
              <CheckCircle2 size={15} />
            </button>
          </Tooltip>
        )}

        <Tooltip content="Prévia Rápida" position="top">
          <button
            onClick={() => setIsQuickViewOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
          >
            <Eye size={15} />
          </button>
        </Tooltip>

        <Tooltip content={favorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'} position="top">
          <button
            onClick={() => toggleFavoriteWithConfirm(anime)}
            className={`p-2 rounded-xl transition-all border ${
              favorited
                ? 'bg-[#FF6B00]/20 border-[#FF6B00]/50 text-[#FF6B00]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Heart size={15} className={favorited ? 'fill-current' : ''} />
          </button>
        </Tooltip>

        <Link
          href={`/anime/${anime.mal_id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs transition-all shadow-md shadow-[#FF6B00]/30 whitespace-nowrap"
        >
          <Play size={13} className="fill-current" />
          <span className="hidden sm:inline">Assistir</span>
        </Link>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        anime={anime}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </motion.div>
  );
}
