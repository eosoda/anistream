import type { SeasonName } from '@/types/anime';

const TOKYO_TIME_ZONE = 'Asia/Tokyo';

function tokyoMonthAndYear(date: Date): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TOKYO_TIME_ZONE, year: 'numeric', month: 'numeric' }).formatToParts(date);
  return {
    month: Number(parts.find((part) => part.type === 'month')?.value || 1),
    year: Number(parts.find((part) => part.type === 'year')?.value || date.getUTCFullYear()),
  };
}

export function getCurrentYear(date: Date = new Date()): number {
  return tokyoMonthAndYear(date).year;
}

export function getCurrentSeason(date: Date = new Date()): SeasonName {
  const month = tokyoMonthAndYear(date).month;
  if (month <= 3) return 'winter';
  if (month <= 6) return 'spring';
  if (month <= 9) return 'summer';
  return 'fall';
}
