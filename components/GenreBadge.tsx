import React from 'react';

interface GenreBadgeProps {
  name: string;
  onClick?: () => void;
  active?: boolean;
}

export function GenreBadge({ name, onClick, active }: GenreBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105 select-none' : ''
      } ${
        active
          ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 font-semibold'
          : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'
      }`}
    >
      {name}
    </span>
  );
}
