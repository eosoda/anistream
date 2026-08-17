'use client';

import React, { useCallback, useState, use } from 'react';
import Link from 'next/link';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { SafeImage } from '@/components/ui/SafeImage';
import {
  Play,
  Heart,
  Star,
  Trophy,
  Users,
  Film,
  Tv,
  Clock,
  Calendar,
  Building,
  BookOpen,
  Share2,
  CheckCircle,
  AlertCircle,
  Compass,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ListVideo,
  Info,
} from 'lucide-react';
import { kenjitsuService } from '@/services/kenjitsu';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { GenreBadge } from '@/components/ui/GenreBadge';
import { EpisodeList } from '@/components/player/EpisodeList';
import { CharacterCard } from '@/components/anime/CharacterCard';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';
import { DetailSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavorites } from '@/hooks/useFavorites';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import {
  formatSeasonName,
  formatStatus,
  formatSource,
  formatNumber,
  formatRating,
  toPlainText,
} from '@/utils/formatters';

export default function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const animeId = parseInt(resolvedParams.id, 10);

  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'characters' | 'relations'>('episodes');
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const closeTrailer = useCallback(() => setShowTrailer(false), []);
  const { panelRef: trailerRef, titleId: trailerTitleId } = useDialogAccessibility(showTrailer, closeTrailer);

  const { isFavorite, toggleFavoriteWithConfirm } = useFavorites();
  const { getAnimeProgress } = useWatchProgress();

  // 1. Fetch Anime Main Info
  const { data: anime, isLoading: isLoadingAnime, error } = useReactQuery({
    queryKey: ['animeDetail', animeId],
    queryFn: () => kenjitsuService.getAnimeById(animeId),
    enabled: !isNaN(animeId),
  });

  // 3. Fetch Episodes
  const { data: episodes, isLoading: isLoadingEpisodes } = useReactQuery({
    queryKey: ['animeEpisodes', animeId],
    queryFn: () => kenjitsuService.getAnimeEpisodes(animeId),
    enabled: !isNaN(animeId),
  });

  // 4. Fetch Characters
  const { data: characters } = useReactQuery({
    queryKey: ['animeCharacters', animeId],
    queryFn: () => kenjitsuService.getAnimeCharacters(animeId),
    enabled: !isNaN(animeId),
  });

  // 5. Fetch Relations
  const { data: relations } = useReactQuery({
    queryKey: ['animeRelations', animeId],
    queryFn: () => kenjitsuService.getAnimeRelations(animeId),
    enabled: !isNaN(animeId),
  });

  if (isLoadingAnime) {
    return <DetailSkeleton />;
  }

  if (error || !anime) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="Anime não encontrado"
          description="Nao foi possivel carregar os detalhes deste anime pelo catalogo Kenjitsu. Tente novamente."
          actionHref="/populares"
          actionText="Explorar Catálogo Popular"
        />
      </div>
    );
  }

  const favorited = isFavorite(anime.mal_id);

  // Watch progress analysis
  const progressList = getAnimeProgress(anime.mal_id);
  const latestWatched = progressList.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const nextEpNum = latestWatched
    ? latestWatched.completed
      ? latestWatched.episodeNum + 1
      : latestWatched.episodeNum
    : 1;

  // High-res backdrop
  const bannerUrl =
    anime.bannerImage ||
    anime.trailer?.images?.maximum_image_url ||
    anime.images?.jpg?.large_image_url;

  const posterUrl =
    anime.images?.jpg?.image_url ||
    anime.images?.webp?.image_url ||
    anime.images?.jpg?.large_image_url ||
    '';

  const englishTitle = toPlainText(anime.title_english);
  const japaneseTitle = toPlainText(anime.title_japanese);
  const mainTitle = toPlainText(anime.title) || englishTitle || japaneseTitle || 'Anime';
  const plainSynopsis = toPlainText(anime.synopsis);
  const plainSeason = toPlainText(anime.season);
  const typeLabel = toPlainText(anime.type) || 'TV';
  const statusLabel = toPlainText(anime.status);
  const sourceLabel = toPlainText(anime.source);
  const durationLabel = toPlainText(anime.duration);
  const ratingLabel = toPlainText(anime.rating);
  const plainStudios = (anime.studios || []).map((studio) => ({ ...studio, name: toPlainText(studio.name) || '—' }));
  const plainProducers = (anime.producers || []).map((producer) => ({ ...producer, name: toPlainText(producer.name) || '—' }));
  const plainGenres = (anime.genres || []).map((genre) => ({ ...genre, name: toPlainText(genre.name) || '—' }));
  const plainThemes = (anime.themes || []).map((theme) => ({ ...theme, name: toPlainText(theme.name) || '—' }));
  const plainDemographics = (anime.demographics || []).map((demographic) => ({ ...demographic, name: toPlainText(demographic.name) || '—' }));
  const yearStr = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : '—');

  const scrollToEpisodes = () => {
    setActiveTab('episodes');
    const el = document.getElementById('episodes-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full pb-20">
      {/* Top Banner Hero */}
      <div className="relative w-full h-[38vh] min-h-[300px] md:h-[48vh] overflow-hidden bg-neutral-900">
        <SafeImage
          src={bannerUrl}
          fallbackSrc={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url}
          animeId={anime.mal_id}
          alt={mainTitle}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-60"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/60 to-transparent" />

        {/* Back Link */}
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 text-white font-semibold text-xs border border-white/10 backdrop-blur-md transition-all shadow-lg"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-28 md:-mt-36 relative z-10 space-y-8">
        {/* Header Grid: Poster + Main Info & Direct Watch CTA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Poster & Quick Action Buttons */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center md:items-start space-y-4">
            <div className="relative w-52 sm:w-60 md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-neutral-900 group">
              <SafeImage
                src={posterUrl}
                fallbackSrc={anime.images?.jpg?.image_url}
                animeId={anime.mal_id}
                alt={mainTitle}
                fill
                priority
                sizes="(max-width: 768px) 240px, 300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Direct Play Overlay on Poster */}
              <Link
                href={`/anime/${anime.mal_id}/episode/${nextEpNum}`}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play size={24} className="fill-current ml-1" />
                </div>
                <span className="text-xs font-black tracking-wider uppercase bg-black/80 px-3 py-1 rounded-full border border-white/10">
                  {latestWatched ? `Continuar Ep. ${nextEpNum}` : `Assistir Ep. ${nextEpNum}`}
                </span>
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2.5 pt-1">
              {/* PRIMARY HIGH-CONTRAST WATCH BUTTON */}
              <Link
                href={`/anime/${anime.mal_id}/episode/${nextEpNum}`}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8800] hover:from-[#FF7A1A] hover:to-[#FF991A] text-white shadow-xl shadow-[#FF6B00]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play size={20} className="fill-current" />
                {latestWatched ? `Continuar Ep. ${nextEpNum}` : `Assistir Ep. ${nextEpNum}`}
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleFavoriteWithConfirm(anime)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                    favorited
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md'
                  }`}
                >
                  <Heart size={15} className={favorited ? 'fill-current' : ''} />
                  {favorited ? 'Salvo' : 'Favoritar'}
                </button>

                {anime.trailer?.embed_url ? (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white backdrop-blur-md transition-all"
                  >
                    <Tv size={15} />
                    Trailer
                  </button>
                ) : (
                  <button
                    onClick={scrollToEpisodes}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white backdrop-blur-md transition-all"
                  >
                    <ListVideo size={15} />
                    Episódios
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Title, Quick Metrics & Truncated Synopsis */}
          <div className="md:col-span-8 lg:col-span-9 space-y-5">
            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 font-extrabold text-xs">
                  {formatStatus(statusLabel)}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 border border-white/10 font-bold text-xs">
                  {typeLabel} • {formatSeasonName(plainSeason)} {yearStr}
                </span>
                <RatingBadge score={anime.score} />
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {mainTitle}
              </h1>

              {japaneseTitle && (
                <p className="text-xs md:text-sm text-gray-400 font-medium">
                  {japaneseTitle} {englishTitle && `• ${englishTitle}`}
                </p>
              )}
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl glass-panel flex items-center gap-2.5 border border-white/5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Star size={18} className="fill-current" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Nota</span>
                  <p className="text-sm font-black text-white">{anime.score ? anime.score.toFixed(2) : '—'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl glass-panel flex items-center gap-2.5 border border-white/5">
                <div className="w-9 h-9 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center flex-shrink-0">
                  <Film size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Episódios</span>
                  <p className="text-sm font-black text-white">{anime.episodes || 'Em lançamento'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl glass-panel flex items-center gap-2.5 border border-white/5">
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Ranking</span>
                  <p className="text-sm font-black text-white">{anime.rank ? `#${anime.rank}` : '—'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl glass-panel flex items-center gap-2.5 border border-white/5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Estúdio</span>
                  <p className="text-sm font-black text-white truncate max-w-[100px]">
                    {plainStudios[0]?.name || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Truncated Synopsis with Toggle */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel space-y-2 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-[#FF6B00]" />
                  Sinopse
                </h3>

                {plainSynopsis && plainSynopsis.length > 220 && (
                  <button
                    onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                    className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
                  >
                    {isSynopsisExpanded ? (
                      <>
                        Recolher <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        Ler mais <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>

              <p
                className={`text-xs md:text-sm text-gray-300 leading-relaxed ${
                  !isSynopsisExpanded ? 'line-clamp-3 md:line-clamp-4' : ''
                }`}
              >
                {plainSynopsis || 'Nenhuma sinopse cadastrada até o momento.'}
              </p>
            </div>

            {/* Quick Genres chips */}
            {plainGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center pt-1">
                <span className="text-xs font-bold text-gray-400 mr-1">Gêneros:</span>
                {plainGenres.map((genre) => (
                  <GenreBadge key={genre.mal_id} name={genre.name} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN SECTION: EPISODES & EXTRA TABS (Desktop Grid: 8 Cols Main, 4 Sidebar) */}
        {/* ========================================================================= */}
        <div id="episodes-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Main Column (8 cols): Episode list & active tab view */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tab Bar Header */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-3">
              <button
                onClick={() => setActiveTab('episodes')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'episodes'
                    ? 'bg-[#FF6B00] text-black shadow-lg shadow-[#FF6B00]/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                }`}
              >
                <ListVideo size={18} />
                Episódios ({episodes?.length || anime.episodes || 'Lista'})
              </button>

              <button
                onClick={() => setActiveTab('info')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'info'
                    ? 'bg-[#FF6B00] text-black shadow-lg shadow-[#FF6B00]/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                }`}
              >
                <Info size={18} />
                Ficha Técnica
              </button>

              <button
                onClick={() => setActiveTab('characters')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === 'characters'
                    ? 'bg-[#FF6B00] text-black shadow-lg shadow-[#FF6B00]/30'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                }`}
              >
                <Users size={18} />
                Personagens ({characters?.length || 0})
              </button>

            </div>

            {/* TAB CONTENT 1: EPISODES (DEFAULT OPEN) */}
            {activeTab === 'episodes' && (
              <div className="space-y-4">
                <EpisodeList
                  animeId={anime.mal_id}
                  episodes={episodes || []}
                  totalEpisodes={anime.episodes}
                  isLoading={isLoadingEpisodes}
                />
              </div>
            )}

            {/* TAB CONTENT 2: FULL FICHA TÉCNICA */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl glass-panel space-y-4 border border-white/10">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-[#FF6B00]" />
                    Sinopse Completa
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {plainSynopsis || 'Nenhuma sinopse cadastrada.'}
                  </p>
                </div>

                <div className="p-6 rounded-2xl glass-panel grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs border border-white/10">
                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Status</span>
                    <span className="text-white font-bold">{formatStatus(statusLabel)}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Ano / Temporada</span>
                    <span className="text-white font-bold">
                      {formatSeasonName(plainSeason)} {yearStr}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Formato</span>
                    <span className="text-white font-bold">{typeLabel}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Fonte Original</span>
                    <span className="text-white font-bold">{formatSource(sourceLabel)}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Estúdio</span>
                    <span className="text-white font-bold">
                      {plainStudios.map((studio) => studio.name).join(', ') || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Produtores</span>
                    <span className="text-white font-bold">
                      {plainProducers.slice(0, 3).map((producer) => producer.name).join(', ') || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Duração p/ Ep</span>
                    <span className="text-white font-bold">{durationLabel || '—'}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 block font-semibold mb-1">Classificação</span>
                    <span className="text-white font-bold">{formatRating(ratingLabel)}</span>
                  </div>
                </div>

                {/* Relations list */}
                {relations && relations.length > 0 && (
                  <div className="p-6 rounded-2xl glass-panel space-y-3 border border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#FF6B00]">
                      Séries Relacionadas & Sequências
                    </h3>
                    <div className="space-y-3">
                      {relations.map((rel, idx) => (
                        <div key={`rel-${idx}`} className="p-3 rounded-xl bg-white/5 space-y-1.5 border border-white/5">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            {toPlainText(rel.relation) || 'Relacionado'}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {rel.entry.map((entry, entryIdx) => (
                              <Link
                                key={`${entry.mal_id}-${entryIdx}`}
                                href={`/anime/${entry.mal_id}`}
                                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-[#FF6B00]/20 text-white hover:text-[#FF6B00] text-xs font-semibold border border-white/10 transition-colors"
                              >
                                {toPlainText(entry.name) || 'Anime relacionado'} ({toPlainText(entry.type) || 'anime'})
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: CHARACTERS */}
            {activeTab === 'characters' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters && characters.length > 0 ? (
                  characters.slice(0, 18).map((char, i) => (
                    <CharacterCard key={`${char.character?.mal_id || 'char'}-${i}`} item={char} />
                  ))
                ) : (
                  <p className="text-gray-400 text-sm col-span-full text-center py-8">
                    Nenhum personagem cadastrado.
                  </p>
                )}
              </div>
            )}

          </div>

          {/* Right Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Resume Card if progress exists */}
            {latestWatched && (
              <div className="p-4 rounded-2xl glass-panel border border-[#FF6B00]/30 bg-[#FF6B00]/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
                  <Clock size={14} />
                  <span>Continuar de onde parou</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">
                    Episódio {latestWatched.episodeNum}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {latestWatched.episodeTitle || `Episódio ${latestWatched.episodeNum}`}
                  </p>
                </div>
                <Link
                  href={`/anime/${anime.mal_id}/episode/${latestWatched.episodeNum}`}
                  className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Play size={14} className="fill-current" />
                  Retomar Episódio
                </Link>
              </div>
            )}

            {/* Ficha Rápida Box */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 pb-2 border-b border-white/10">
                Informações do Anime
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Status</span>
                  <span className="font-bold text-white">{formatStatus(statusLabel)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Formato</span>
                  <span className="font-bold text-white">{typeLabel}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Episódios</span>
                  <span className="font-bold text-white">{anime.episodes || 'Em exibição'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Duração por Ep</span>
                  <span className="font-bold text-white">{durationLabel || '—'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Temporada</span>
                  <span className="font-bold text-white">
                    {formatSeasonName(plainSeason)} {yearStr}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Estúdio</span>
                  <span className="font-bold text-white">
                    {plainStudios.map((studio) => studio.name).join(', ') || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Popularidade</span>
                  <span className="font-bold text-white">{anime.popularity ? `#${anime.popularity}` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Themes & Demographics */}
            {(plainThemes.length || plainDemographics.length) ? (
              <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 pb-2 border-b border-white/10">
                  Temas e Público
                </h3>

                {plainThemes.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-gray-500 font-bold">Temas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {plainThemes.map((theme) => (
                        <span
                          key={theme.mal_id}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-[11px] font-medium"
                        >
                          {theme.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {plainDemographics.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs text-gray-400 font-bold">Demografia:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {plainDemographics.map((demographic) => (
                        <span
                          key={demographic.mal_id}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold"
                        >
                          {demographic.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* YouTube Trailer Modal */}
      {showTrailer && anime.trailer?.embed_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div ref={trailerRef} role="dialog" aria-modal="true" aria-labelledby={trailerTitleId} className="relative w-full max-w-4xl bg-[#14141C] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 id={trailerTitleId} className="font-bold text-white text-base truncate">
                Trailer: {mainTitle}
              </h3>
              <button
                onClick={closeTrailer}
                className="px-3 py-1 rounded-lg bg-white/10 text-white hover:bg-[#FF6B00] text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="relative aspect-video w-full">
              <iframe
                src={`${anime.trailer.embed_url}?autoplay=1`}
                title="Anime Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
