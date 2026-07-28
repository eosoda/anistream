'use client';

import React from 'react';
import { Sun, Snowflake, Leaf, Flower2, Calendar } from 'lucide-react';
import { SeasonName } from '@/types/anime';

interface SeasonSelectorProps {
  selectedYear: number;
  selectedSeason: SeasonName;
  onSelectYear: (year: number) => void;
  onSelectSeason: (season: SeasonName) => void;
}

const SEASONS: { id: SeasonName; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'spring', label: 'Primavera', icon: <Flower2 size={18} />, color: 'text-pink-400' },
  { id: 'summer', label: 'Verão', icon: <Sun size={18} />, color: 'text-amber-400' },
  { id: 'fall', label: 'Outono', icon: <Leaf size={18} />, color: 'text-orange-400' },
  { id: 'winter', label: 'Inverno', icon: <Snowflake size={18} />, color: 'text-cyan-400' },
];

const currentMaxYear = Math.max(2025, new Date().getFullYear());
const YEARS = Array.from({ length: 16 }, (_, i) => currentMaxYear - i);

export function SeasonSelector({
  selectedYear,
  selectedSeason,
  onSelectYear,
  onSelectSeason,
}: SeasonSelectorProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass-panel my-6 border border-white/10">
      {/* Year Dropdown */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <span className="text-sm font-semibold text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
          <Calendar size={16} className="text-[#FF6B00]" />
          Ano:
        </span>
        <select
          value={selectedYear}
          onChange={(e) => onSelectYear(Number(e.target.value))}
          className="bg-white/10 text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#FF6B00] cursor-pointer"
        >
          {YEARS.map((y) => (
            <option key={y} value={y} className="bg-[#14141C] text-white">
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Season Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
        {SEASONS.map((s) => {
          const isActive = selectedSeason === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSeason(s.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                isActive
                  ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 border border-[#FF6B00]'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              <span className={isActive ? 'text-white' : s.color}>{s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
