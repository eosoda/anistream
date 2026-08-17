'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MessageSquare, Mic, PlayCircle, Tv } from 'lucide-react';
import { JikanAnime } from '@/types/anime';
import { SafeImage } from '@/components/ui/SafeImage';
import { RatingBadge } from '@/components/ui/RatingBadge';
import { checkPtBrAvailability } from '@/utils/audioFilter';
import { toPlainText } from '@/utils/formatters';

interface ProgressSummary {
  watchedEpCount: number;
  totalEpisodes: number | null;
  percentage: number | null;
}

interface CarouselAnimeCardProps {
  anime: JikanAnime;
  favorited: boolean;
  progress: ProgressSummary | null;
  onToggleFavorite: (anime: JikanAnime) => void;
}

export function CarouselAnimeCard({ anime, favorited, progress, onToggleFavorite }: CarouselAnimeCardProps) {
  const title = toPlainText(anime.title) || toPlainText(anime.title_english) || toPlainText(anime.title_japanese) || 'Sem título';
  const type = toPlainText(anime.type) || 'TV';
  const isMovie = type.toLowerCase() === 'movie';
  const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null);
  const imageUrl = anime.images?.jpg?.image_url || anime.images?.webp?.image_url;
  const { hasDub } = checkPtBrAvailability(anime);

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121219] transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-[#FF6B00]/60">
      <Link href={`/anime/${anime.mal_id}`} prefetch={false} className="relative block aspect-[2/3] w-full overflow-hidden bg-neutral-900">
        <SafeImage
          src={imageUrl}
          animeId={anime.mal_id}
          alt={title}
          fill
          sizes="(max-width: 640px) 145px, (max-width: 1024px) 185px, 205px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-black/25" />
        <div className="absolute left-2 right-2 top-2 flex items-center justify-between gap-2">
          <RatingBadge score={anime.score} />
          {favorited && <Heart size={20} className="fill-[#FF6B00] text-[#FF6B00] drop-shadow" />}
        </div>
        <div className={`absolute left-2 right-2 flex items-center justify-between text-[10px] font-bold ${progress ? 'bottom-8' : 'bottom-2'}`}>
          <span className="flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-gray-200">
            <Tv size={10} className="text-[#FF6B00]" /> {type}{year ? ` · ${year}` : ''}
          </span>
          <span className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-white ${hasDub ? 'bg-purple-600/90' : 'bg-emerald-600/90'}`}>
            {hasDub ? <Mic size={9} /> : <MessageSquare size={9} />}
            {hasDub ? 'DUB' : 'LEG'}
          </span>
        </div>
        {progress && (
          <div className="absolute inset-x-0 bottom-0 bg-black/85">
            <div className="flex items-center justify-between px-2 py-0.5 text-[9px] font-bold text-emerald-400">
              <span className="flex items-center gap-1"><PlayCircle size={9} />{progress.watchedEpCount}/{progress.totalEpisodes || '?'} eps</span>
              <span>{progress.percentage !== null ? `${progress.percentage}%` : 'Assistindo'}</span>
            </div>
            <div className="h-1 bg-white/10"><div className="h-full bg-[#FF6B00]" style={{ width: `${progress.percentage ?? 8}%` }} /></div>
          </div>
        )}
      </Link>

      <div className="flex min-h-[112px] flex-1 flex-col justify-between gap-2 p-3">
        <div>
          <Link href={`/anime/${anime.mal_id}`} prefetch={false} title={title} className="line-clamp-2 text-sm font-bold leading-5 text-white transition-colors group-hover:text-[#FF6B00]">
            {title}
          </Link>
          {!isMovie && <p className="mt-1 text-xs text-gray-400">{anime.episodes ? `${anime.episodes} eps` : 'Em lançamento'}</p>}
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(anime)}
          aria-label={favorited ? `Remover ${title} dos favoritos` : `Adicionar ${title} aos favoritos`}
          className={`ml-auto rounded-full p-1.5 transition-colors ${favorited ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
        >
          <Heart size={14} className={favorited ? 'fill-current' : ''} />
        </button>
      </div>
    </article>
  );
}
