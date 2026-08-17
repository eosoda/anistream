import { describe, expect, it } from 'vitest';
import { getCurrentSeason, getCurrentYear } from '@/utils/season';

describe('season date helpers', () => {
  it('calculates the current year at runtime', () => {
    expect(getCurrentYear(new Date('2026-08-16T12:00:00Z'))).toBe(2026);
  });

  it('maps each quarter to the expected anime season', () => {
    expect(getCurrentSeason(new Date('2026-01-10T12:00:00Z'))).toBe('winter');
    expect(getCurrentSeason(new Date('2026-04-10T12:00:00Z'))).toBe('spring');
    expect(getCurrentSeason(new Date('2026-07-10T12:00:00Z'))).toBe('summer');
    expect(getCurrentSeason(new Date('2026-10-10T12:00:00Z'))).toBe('fall');
  });

  it('uses Tokyo time at year and season boundaries', () => {
    const beforeTokyoNewYear = new Date('2026-12-31T14:59:00Z');
    const afterTokyoNewYear = new Date('2026-12-31T15:00:00Z');
    expect(getCurrentYear(beforeTokyoNewYear)).toBe(2026);
    expect(getCurrentSeason(beforeTokyoNewYear)).toBe('fall');
    expect(getCurrentYear(afterTokyoNewYear)).toBe(2027);
    expect(getCurrentSeason(afterTokyoNewYear)).toBe('winter');
  });
});
