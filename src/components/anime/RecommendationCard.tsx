import React from 'react';
import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { JikanRecommendation } from '@/types/anime';
import { SafeImage } from '@/components/ui/SafeImage';

interface RecommendationCardProps {
  item: JikanRecommendation;
}

export function RecommendationCard({ item }: RecommendationCardProps) {
  const { entry, votes } = item;
  const imageUrl =
    entry.images?.jpg?.large_image_url ||
    entry.images?.jpg?.image_url;

  return (
    <Link
      href={`/anime/${entry.mal_id}`}
      className="group flex flex-col w-full rounded-xl overflow-hidden glass-panel glass-panel-hover"
    >
      <div className="relative aspect-[2/3] w-full bg-neutral-900 overflow-hidden">
        <SafeImage
          src={imageUrl}
          fallbackSrc={entry.images?.jpg?.image_url}
          animeId={entry.mal_id}
          alt={entry.title}
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {votes > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <ThumbsUp size={10} />
            {votes}
          </div>
        )}
      </div>

      <div className="p-3">
        <h4 className="text-xs font-bold text-white group-hover:text-[#FF6B00] transition-colors line-clamp-2">
          {entry.title}
        </h4>
      </div>
    </Link>
  );
}
