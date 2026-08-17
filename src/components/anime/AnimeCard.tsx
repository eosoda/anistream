'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Heart, Tv, Sparkles, CheckCircle, PlayCircle, Mic, MessageSquare } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { SafeImage } from '@/components/ui/SafeImage';
import { checkPtBrAvailability } from '@/utils/audioFilter';
import { Tooltip } from '@/components/ui/Tooltip';
import { toPlainText } from '@/utils/formatters';
import { usePublicExperience } from '@/components/experience/PublicExperienceProvider';

interface AnimeCardProps {
  anime: JikanAnime;
  aspectRatio?: 'portrait' | 'wide';
  priority?: boolean;
  index?: number;
}

export function AnimeCard({ anime, aspectRatio = 'portrait', priority = false }: AnimeCardProps) {
  const router = useRouter();
  const { isFavorite, toggleFavoriteWithConfirm, newEpisodesMap, markAsSeen } = useFavorites();
  const { getAnimeOverallProgress } = useWatchProgress();
  const { config } = usePublicExperience();

  const favorited = isFavorite(anime.mal_id);
  const overallProgress = config.features.watchHistory ? getAnimeOverallProgress(anime.mal_id, anime.episodes) : null;

  const epInfo = config.features.favorites && favorited ? newEpisodesMap[anime.mal_id] : undefined;
  const hasNewEpisode = epInfo?.hasNewEpisode;

  const { hasDub } = checkPtBrAvailability(anime);

  const imageUrl = anime.images?.jpg?.image_url || anime.images?.webp?.image_url || anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url;

  const title = toPlainText(anime.title) || toPlainText(anime.title_english) || toPlainText(anime.title_japanese) || 'Sem título';
  const typeStr = toPlainText(anime.type) || 'TV';
  const isMovie = typeStr.toLowerCase() === 'movie';
  const episodesCount = anime.episodes ? `${anime.episodes} eps` : 'Em lançamento';
  const yearStr = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null);
  const statusStr = toPlainText(anime.status);
  const genreNames = anime.genres?.map((genre) => toPlainText(genre.name)).filter(Boolean).slice(0, 2).join(' · ');

  return (
    <div
      onClick={(event) => {
        if (event.defaultPrevented || (event.target as HTMLElement).closest('a, button')) return;
        router.push(`/anime/${anime.mal_id}`);
      }}
      className={`group relative flex flex-col w-full h-full cursor-pointer rounded-xl overflow-hidden glass-panel glass-panel-hover transition-all duration-300 ease-out ${
        hasNewEpisode ? 'ring-2 ring-emerald-500/70 shadow-lg shadow-emerald-500/20' : ''
      }`}
    >
      <Link href={`/anime/${anime.mal_id}`} className="block relative overflow-hidden aspect-[2/3] w-full bg-neutral-900">
        <SafeImage
          src={imageUrl}
          fallbackSrc={config.catalog.placeholderImage}
          animeId={anime.mal_id}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          priority={priority}
        />

        {/* Gradient dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none gap-1">
          {hasNewEpisode ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50 border border-emerald-300/40 flex items-center gap-1 animate-pulse">
              <Sparkles size={11} className="text-yellow-200 fill-current" />
              <span>{epInfo?.latestEpisodeNum ? `EP. ${epInfo.latestEpisodeNum} NOVO` : 'NOVO EP'}</span>
            </span>
          ) : (
            config.catalog.showScore && <RatingBadge score={anime.score} />
          )}

          {config.features.favorites && favorited && (
            <span className="p-1.5 rounded-full bg-[#FF6B00] text-white shadow-md">
              <Heart size={12} className="fill-current" />
            </span>
          )}
        </div>

        {/* Hover play affordance */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg shadow-[#FF6B00]/50 transform scale-75 group-hover:scale-100 transition-transform">
            <Play size={22} className="fill-current ml-1" />
          </div>
        </div>

        {/* Type & Season Overlay at bottom of poster */}
        <div
          className={`absolute left-2 right-2 flex items-center justify-between gap-1 text-[11px] font-semibold text-gray-300 transition-all ${
            overallProgress ? 'bottom-9' : 'bottom-2'
          }`}
        >
          <div className="flex items-center gap-1">
            {config.catalog.showType && (
              <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 flex items-center gap-1">
                <Tv size={10} className="text-[#FF6B00]" />
                {typeStr}
              </span>
            )}
            {config.catalog.showYear && yearStr && <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10">{yearStr}</span>}
          </div>

          {hasDub ? (
            <Tooltip content="Dublagem em Português disponível" position="top">
              <span className="px-1.5 py-0.5 rounded bg-purple-600/80 text-white font-extrabold text-[9px] border border-purple-400/30 flex items-center gap-0.5 cursor-help">
                <Mic size={9} /> DUB
              </span>
            </Tooltip>
          ) : (
            <Tooltip content="Legendas em Português disponíveis" position="top">
              <span className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white font-extrabold text-[9px] border border-emerald-400/30 flex items-center gap-0.5 cursor-help">
                <MessageSquare size={9} /> LEG
              </span>
            </Tooltip>
          )}
        </div>

        {/* Global Watch Progress Indicator Overlay on Poster */}
        {overallProgress && (
          <div className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden pointer-events-none">
            <div className="px-2 py-0.5 bg-black/85 backdrop-blur-md flex items-center justify-between text-[10px] font-extrabold text-white">
              <span className="flex items-center gap-1 text-emerald-400">
                <PlayCircle size={10} className="fill-emerald-500/30 text-emerald-400" />
                <span>
                  {isMovie && overallProgress.percentage !== null
                    ? `${overallProgress.percentage}% assistido`
                    : overallProgress.totalEpisodes
                      ? `${overallProgress.watchedEpCount}/${overallProgress.totalEpisodes} eps`
                      : `${overallProgress.watchedEpCount} ep${overallProgress.watchedEpCount > 1 ? 's' : ''}`}
                </span>
              </span>
              <span className="text-emerald-400 font-black">{overallProgress.percentage !== null ? `${overallProgress.percentage}%` : 'Assistindo'}</span>
            </div>

            {/* Glowing horizontal progress bar */}
            <div className="w-full h-1.5 bg-black/70 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  overallProgress.isFinished
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300 shadow-sm shadow-emerald-500'
                    : 'bg-gradient-to-r from-[#FF6B00] via-amber-400 to-emerald-400 shadow-sm shadow-[#FF6B00]'
                }`}
                style={{
                  width: `${overallProgress.percentage !== null ? Math.max(overallProgress.percentage, 6) : 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </Link>

      {/* Card Details */}
      <div className="p-3 flex flex-col justify-between flex-grow gap-2">
        <div className="space-y-1">
          <Link href={`/anime/${anime.mal_id}`} className="hover:text-[#FF6B00] transition-colors">
            <h3 className="min-h-10 break-words text-sm font-bold leading-5 text-white transition-colors group-hover:text-[#FF6B00]" title={title}>
              {title}
            </h3>
          </Link>
          {!isMovie && config.catalog.showEpisodes && (
            <p className="min-h-8 break-words text-xs leading-4 text-gray-400">
              {overallProgress ? (
                <span className="text-emerald-400 font-bold">
                  {overallProgress.percentage !== null
                    ? `${overallProgress.percentage}% assistido (${overallProgress.watchedEpCount}/${overallProgress.totalEpisodes} eps)`
                    : `${overallProgress.watchedEpCount} ep(s) assistidos`}
                </span>
              ) : (
                episodesCount
              )}
            </p>
          )}
          {config.catalog.showStatus && statusStr && (
            <p className="truncate text-[11px] leading-4 text-gray-500" title={statusStr}>
              {statusStr}
            </p>
          )}
          {config.catalog.showGenres && genreNames && (
            <p className="truncate text-[11px] leading-4 text-gray-500" title={genreNames}>
              {genreNames}
            </p>
          )}
        </div>

        {/* New Episode info & mark as seen bar */}
        {hasNewEpisode && (
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
            <span className="truncate pr-1" title={epInfo?.latestEpisodeTitle}>
              {epInfo?.latestEpisodeTitle || 'Novo episódio lançado!'}
            </span>
            <Tooltip content="Marcar como visto" position="top">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  markAsSeen(anime.mal_id);
                }}
                className="p-0.5 hover:bg-emerald-500/30 text-emerald-300 rounded transition-colors flex-shrink-0"
              >
                <CheckCircle size={13} />
              </button>
            </Tooltip>
          </div>
        )}

        {/* Favorite Action Button */}
        {config.features.favorites && (
          <div className="flex items-center justify-end pt-1 border-t border-white/5">
            <Tooltip content={favorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'} position="left">
              <button
                aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavoriteWithConfirm(anime);
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  favorited ? 'text-[#FF6B00] bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Heart size={14} className={favorited ? 'fill-current' : ''} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
