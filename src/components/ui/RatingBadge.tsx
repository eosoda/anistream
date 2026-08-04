import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  score: number | null | undefined;
  showStar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingBadge({ score, showStar = true, size = 'sm' }: RatingBadgeProps) {
  if (score === null || score === undefined || score === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-xs font-semibold">
        —
      </span>
    );
  }

  let colorClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (score < 6) {
    colorClasses = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  } else if (score < 7.5) {
    colorClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2 font-bold',
  }[size];

  const starSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border backdrop-blur-md ${colorClasses} ${sizeClasses}`}
    >
      {showStar && <Star size={starSizes} className="fill-current" />}
      <span>{score.toFixed(2)}</span>
    </span>
  );
}
