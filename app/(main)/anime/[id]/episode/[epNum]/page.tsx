'use client';

import React, { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, List, CheckCircle2, Clock } from 'lucide-react';
import { jikanService } from '@/services/jikan';
import { DetailSkeleton } from '@/components/ui/LoadingSkeleton';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { SafeImage } from '@/components/ui/SafeImage';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useDraggableScroll } from '@/hooks/useDraggableScroll';

export default function EpisodePlayerPage({ params }: { params: Promise<{ id: string; epNum: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const animeId = parseInt(resolvedParams.id, 10);
  const epNum = parseInt(resolvedParams.epNum, 10);

  const { progressMap } = useWatchProgress();
  const [preferredProvider, setPreferredProvider] = React.useState<string | null>(null);
  const [isProviderPreferenceReady, setIsProviderPreferenceReady] = React.useState(false);
  const metadataRetryRef = React.useRef(false);
  const {
    ref: episodeScrollRef,
    elementRef: episodeScrollElementRef,
    isDragging: isEpisodeDragging,
  } =
    useDraggableScroll<HTMLDivElement>();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPreferredProvider(window.localStorage.getItem('preferredStreamProvider'));
      setIsProviderPreferenceReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    metadataRetryRef.current = false;
  }, [animeId, epNum, preferredProvider]);

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
  const {
    data: streamResult,
    isLoading: isResolvingStream,
    isFetching: isRefreshingStream,
    refetch: refetchStream,
  } = useQuery({
    queryKey: ['streamResolve', animeId, epNum, preferredProvider],
    queryFn: async () => {
      try {
        const res = await fetch('/api/streams/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeId: String(animeId),
            season: 1,
            episode: epNum,
            episodeNumber: epNum,
            animeTitle: anime?.title_english || anime?.title,
            originalTitle: anime?.title_japanese,
            aliases: anime?.titles?.map((title) => title.title).filter(Boolean),
            preferredProvider: preferredProvider || undefined,
            resolutionMode: 'fast',
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const errorMessage =
            typeof data.error === 'object' && data.error !== null
              ? data.error.message || 'Sem fontes disponíveis no momento'
              : typeof data.error === 'string'
                ? data.error
                : 'Sem fontes disponíveis no momento';
          return { data: null, status: res.status, error: errorMessage };
        }
        return { data: data.data || data, status: 200, error: null };
      } catch (err: any) {
        return {
          data: null,
          status: 500,
          error: err.message || 'Erro de conexão ao buscar fontes',
        };
      }
    },
    enabled: !isNaN(animeId) && !isNaN(epNum) && isProviderPreferenceReady,
    placeholderData: keepPreviousData,
  });

  // O primeiro pedido usa apenas o identificador e o banco local. Se ele nÃ£o
  // encontrar uma fonte e o Jikan terminar depois, repetimos uma Ãºnica vez
  // com os tÃ­tulos enriquecidos, sem criar um waterfall para toda navegaÃ§Ã£o.
  useEffect(() => {
    if (
      !anime ||
      isResolvingStream ||
      streamResult?.data ||
      metadataRetryRef.current
    ) {
      return;
    }
    metadataRetryRef.current = true;
    void refetchStream();
  }, [anime, isResolvingStream, refetchStream, streamResult?.data]);

  const alternativesQuery = useQuery({
    queryKey: ['streamAlternatives', animeId, epNum, preferredProvider],
    queryFn: async () => {
      const response = await fetch('/api/streams/resolve/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId: String(animeId),
          season: 1,
          episode: epNum,
          episodeNumber: epNum,
          animeTitle: anime?.title_english || anime?.title,
          originalTitle: anime?.title_japanese,
          aliases: anime?.titles?.map((title) => title.title).filter(Boolean),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || 'Não foi possível buscar outras fontes.');
      return payload.data || payload;
    },
    enabled: Boolean(streamResult?.data?.resolution?.alternativesPending),
    staleTime: 60_000,
    retry: 1,
  });

  const resolvedStream = React.useMemo(() => {
    const baseStream = streamResult?.data;
    const additional = alternativesQuery.data;
    if (!baseStream || !additional) return baseStream;

    const alternativesById = new Map(
      [...(baseStream.alternatives || []), ...(additional.alternatives || [])].map((alternative) => [alternative.sourceId, alternative])
    );
    return {
      ...baseStream,
      alternatives: Array.from(alternativesById.values()),
      availableProviders: additional.availableProviders || baseStream.availableProviders,
      resolution: alternativesQuery.isError
        ? {
            ...(baseStream.resolution || { phase: 'fast' as const, cacheHit: false }),
            alternativesPending: false,
          }
        : additional.resolution || {
            phase: 'complete' as const,
            alternativesPending: false,
            cacheHit: false,
          },
    };
  }, [alternativesQuery.data, alternativesQuery.isError, streamResult?.data]);

  const episodeList = React.useMemo(() => {
    const fetchedEpisodes = episodes || [];
    const highestFetchedEpisode = fetchedEpisodes.reduce((highest, episode) => Math.max(highest, episode.mal_id), 0);
    const totalEpisodes = Math.max(anime?.episodes || 0, highestFetchedEpisode);

    if (totalEpisodes === 0) return fetchedEpisodes;

    const episodesByNumber = new Map(fetchedEpisodes.map((episode) => [episode.mal_id, episode]));
    return Array.from({ length: totalEpisodes }, (_, index) => {
      const number = index + 1;
      return (
        episodesByNumber.get(number) || {
          mal_id: number,
          title: `Episódio ${number}`,
        }
      );
    });
  }, [anime?.episodes, episodes]);

  useEffect(() => {
    const currentCard = episodeScrollElementRef.current?.querySelector<HTMLElement>(
      `[data-episode="${epNum}"]`
    );

    currentCard?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [epNum, episodeList.length, episodeScrollElementRef]);

  if (isLoadingAnime) {
    return <DetailSkeleton />;
  }

  const currentEp = episodeList.find((episode) => episode.mal_id === epNum);
  const prevEp = epNum > 1 ? epNum - 1 : null;
  const nextEp = anime?.episodes ? (epNum < anime.episodes ? epNum + 1 : null) : epNum + 1;

  const mainTitle = anime?.title_english || anime?.title || 'Anime';
  const posterUrl = anime?.images?.webp?.large_image_url || anime?.images?.jpg?.large_image_url;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link href={`/anime/${animeId}`} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FF6B00] transition-colors font-semibold">
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
            <button disabled className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-600 border border-white/5 text-xs font-bold cursor-not-allowed">
              Anterior
            </button>
          )}

          <span className="px-3 py-1.5 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] font-black text-xs border border-[#FF6B00]/30">EP {epNum}</span>

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
        resolvedStream={resolvedStream}
        streamStatusMessage={streamResult?.error}
        isResolving={isResolvingStream || isRefreshingStream || alternativesQuery.isFetching}
        onNextEpisode={() => {
          if (nextEp) {
            router.push(`/anime/${animeId}/episode/${nextEp}`);
          }
        }}
        onProviderChange={(provider) => {
          window.localStorage.setItem('preferredStreamProvider', provider);
          setPreferredProvider(provider);
        }}
      />

      {/* Episode Carousel below player for binge-watching */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <List size={20} className="text-[#FF6B00]" />
            <span>Episódios desta temporada</span>
          </h3>
          <span className="text-xs text-gray-400 font-semibold">{episodeList.length} episódios disponíveis</span>
        </div>

        {/* Sliding Episode Row */}
        <div
          ref={episodeScrollRef}
          aria-label="Lista de episódios. Arraste horizontalmente para navegar."
          className={`episode-scrollbar flex touch-pan-y items-stretch gap-2 overflow-x-auto pb-3 pt-2 pr-2 select-none overscroll-x-contain cursor-grab active:cursor-grabbing ${
            isEpisodeDragging ? 'scroll-auto' : 'scroll-smooth'
          }`}
        >
          {episodeList.map((ep, index) => {
            const isCurrent = ep.mal_id === epNum;
            const progress = progressMap[`${animeId}_ep_${ep.mal_id}`];

            return (
              <Link
                key={`${ep.mal_id}-${index}`}
                data-episode={ep.mal_id}
                href={`/anime/${animeId}/episode/${ep.mal_id}`}
                draggable={false}
                className={`group relative flex-shrink-0 w-36 sm:w-40 p-2 rounded-xl border transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-1 overflow-hidden space-y-1.5 ${
                  isCurrent ? 'bg-[#FF6B00]/20 border-[#FF6B00] ring-1 ring-[#FF6B00]/50 shadow-lg shadow-[#FF6B00]/15 hover:shadow-xl hover:shadow-[#FF6B00]/25' : 'glass-panel hover:bg-white/10 text-gray-300 border-white/10 hover:border-[#FF6B00]/40 hover:shadow-xl hover:shadow-black/30'
                }`}
              >
                {/* Poster Preview / Thumbnail Header */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-white/10 pointer-events-none">
                  {posterUrl ? (
                    <SafeImage
                      src={posterUrl}
                      animeId={animeId}
                      alt={ep.title || `Episódio ${ep.mal_id}`}
                      fill
                      sizes="(max-width: 640px) 144px, 160px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-gray-500 font-bold text-xs">EP {ep.mal_id}</div>
                  )}

                  {isCurrent && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#FF6B00] text-black font-black text-xs shadow-md flex items-center gap-1 uppercase tracking-wide">
                      <Clock size={10} />
                      <span>Assistindo</span>
                    </div>
                  )}

                  {progress?.completed && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-emerald-500 text-black shadow-md">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>

                {/* Title & Info */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isCurrent ? 'text-[#FF6B00]' : 'text-white'}`}>EP {ep.mal_id}</span>
                    {progress && !progress.completed && progress.percentage > 0 && <span className="text-[10px] text-gray-400 font-mono">{progress.percentage}%</span>}
                  </div>
                  <p className="text-[10px] text-gray-300 truncate font-semibold mt-0.5">{ep.title || `Episódio ${ep.mal_id}`}</p>
                </div>

                {/* Bottom Watch Progress Line */}
                {progress && !progress.completed && progress.percentage > 0 && (
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${isCurrent ? 'bg-[#FF6B00]' : 'bg-white/80'}`} style={{ width: `${progress.percentage}%` }} />
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
