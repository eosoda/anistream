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

  // Fetch Streams via API /api/streams/resolve
  const { data: streamResult } = useQuery({
    queryKey: ['streamResolve', animeId, epNum],
    queryFn: async () => {
      try {
        const res = await fetch('/api/streams/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeId: String(animeId),
            season: 1,
            episodeNumber: epNum,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: null, status: res.status, error: data.error || 'Sem fontes disponíveis no momento' };
        }
        return { data, status: 200, error: null };
      } catch (err: any) {
        return { data: null, status: 500, error: err.message || 'Erro de conexão ao buscar fontes' };
      }
    },
    enabled: !isNaN(animeId) && !isNaN(epNum),
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

      {/* Video Player Component com fontes dinâmicas */}
      <VideoPlayer
        animeId={animeId}
        animeTitle={mainTitle}
        animeImage={posterUrl}
        episodeNum={epNum}
        episodeTitle={currentEp?.title}
        nextEpNum={nextEp}
        resolvedStream={streamResult?.data}
        streamStatusMessage={streamResult?.error}
        onNextEpisode={() => {
          if (nextEp) {
            router.push(`/anime/${animeId}/episode/${nextEp}`);
          }
        }}
      />

      {/* Episode Carousel below player for binge-watching */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <List size={20} className="text-[#FF6B00]" />
            <span>Episódios desta temporada</span>
          </h3>
          <span className="text-xs text-gray-400 font-semibold">
            {episodes?.length || 0} episódios disponíveis
          </span>
        </div>

        {/* Sliding Episode Row */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 select-none">
          {episodes?.map((ep, index) => {
            const isCurrent = ep.mal_id === epNum;
            const progress = progressMap[`${animeId}_ep_${ep.mal_id}`];

            return (
              <Link
                key={`${ep.mal_id}-${index}`}
                href={`/anime/${animeId}/episode/${ep.mal_id}`}
                className={`relative flex-shrink-0 w-44 sm:w-52 p-3 rounded-2xl border transition-all overflow-hidden space-y-2 ${
                  isCurrent
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00] ring-2 ring-[#FF6B00]/40 shadow-xl shadow-[#FF6B00]/20'
                    : 'glass-panel hover:bg-white/10 text-gray-300 border-white/10'
                }`}
              >
                {/* Poster Preview / Thumbnail Header */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/10">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={ep.title || `Episódio ${ep.mal_id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-gray-500 font-bold text-xs">
                      EP {ep.mal_id}
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#FF6B00] text-white font-black text-[10px] shadow-md flex items-center gap-1 uppercase tracking-wider">
                      <Clock size={10} />
                      <span>Assistindo</span>
                    </div>
                  )}

                  {progress?.completed && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-emerald-500 text-black shadow-md">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>

                {/* Title & Info */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isCurrent ? 'text-[#FF6B00]' : 'text-white'}`}>
                      EP {ep.mal_id}
                    </span>
                    {progress && !progress.completed && progress.percentage > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        {progress.percentage}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 truncate font-semibold mt-0.5">
                    {ep.title || `Episódio ${ep.mal_id}`}
                  </p>
                </div>

                {/* Bottom Watch Progress Line */}
                {progress && !progress.completed && progress.percentage > 0 && (
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isCurrent ? 'bg-[#FF6B00]' : 'bg-white/80'}`}
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
