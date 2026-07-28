'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { DetailSkeleton } from '@/components/ui/LoadingSkeleton';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { useWatchProgress } from '@/hooks/useWatchProgress';

export default function EpisodePlayerPage({
  params,
}: {
  params: Promise<{ id: string; epNum: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const animeId = parseInt(resolvedParams.id, 10);
  const epNum = parseInt(resolvedParams.epNum, 10);

  const { progressMap } = useWatchProgress();

  // Fetch Anime Main Info
  const { data: anime, isLoading: isLoadingAnime } = useQuery({
    queryKey: ['animeDetail', animeId],
    queryFn: () => jikanService.getAnimeById(animeId),
    enabled: !isNaN(animeId),
  });

  // Fetch Anime Episodes list for pagination
  const { data: episodes } = useQuery({
    queryKey: ['animeEpisodes', animeId],
    queryFn: () => jikanService.getAnimeEpisodes(animeId),
    enabled: !isNaN(animeId),
  });

  if (isLoadingAnime) {
    return <DetailSkeleton />;
  }

  const currentEp = episodes?.find((e) => e.mal_id === epNum);
  const prevEp = epNum > 1 ? epNum - 1 : null;
  const nextEp = anime?.episodes ? (epNum < anime.episodes ? epNum + 1 : null) : epNum + 1;

  const mainTitle = anime?.title_english || anime?.title || 'Anime';
  const posterUrl =
    anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link
          href={`/anime/${animeId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FF6B00] transition-colors font-semibold"
        >
          <ArrowLeft size={18} />
          Voltar para {mainTitle}
        </Link>

        {/* Episode Pagination Controls */}
        <div className="flex items-center gap-2">
          {prevEp ? (
            <Link
              href={`/anime/${animeId}/episode/${prevEp}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-all"
            >
              <ChevronLeft size={16} />
              Episódio Anterior
            </Link>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-600 border border-white/5 text-xs font-bold cursor-not-allowed"
            >
              Anterior
            </button>
          )}

          <span className="px-3 py-1.5 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] font-black text-xs border border-[#FF6B00]/30">
            EP {epNum}
          </span>

          {nextEp && (
            <Link
              href={`/anime/${animeId}/episode/${nextEp}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-all"
            >
              Próximo Episódio
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {/* Video Player Component */}
      <VideoPlayer
        animeId={animeId}
        animeTitle={mainTitle}
        animeImage={posterUrl}
        episodeNum={epNum}
        episodeTitle={currentEp?.title}
        nextEpNum={nextEp}
        onNextEpisode={() => {
          if (nextEp) {
            router.push(`/anime/${animeId}/episode/${nextEp}`);
          }
        }}
      />

      {/* Episode selector list with watch progress badges */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <List size={20} className="text-[#FF6B00]" />
          Outros episódios desta temporada
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {episodes?.map((ep, index) => {
            const isCurrent = ep.mal_id === epNum;
            const progress = progressMap[`${animeId}_ep_${ep.mal_id}`];

            return (
              <Link
                key={`${ep.mal_id}-${index}`}
                href={`/anime/${animeId}/episode/${ep.mal_id}`}
                className={`relative p-3 rounded-xl text-center font-bold text-xs border transition-all overflow-hidden ${
                  isCurrent
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg shadow-[#FF6B00]/40'
                    : 'glass-panel hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>EP {ep.mal_id}</span>
                  {progress?.completed && (
                    <CheckCircle2 size={12} className={isCurrent ? 'text-white' : 'text-[#FF6B00]'} />
                  )}
                </div>

                {/* Progress bar at bottom of tile if in progress */}
                {progress && !progress.completed && progress.percentage > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                    <div
                      className={`h-full ${isCurrent ? 'bg-white' : 'bg-[#FF6B00]'}`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
