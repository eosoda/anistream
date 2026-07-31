import { describe, expect, it } from 'vitest';
import { OpeningIntervalSchema } from '@/schemas/episode';
import { formatOpeningTime, parseOpeningTime } from '@/lib/openings/time';

describe('opening interval', () => {
  it('preserves decimal precision when formatting and parsing', () => {
    expect(formatOpeningTime(124.54)).toBe('02:04.54');
    expect(parseOpeningTime('02:04.54')).toBe(124.54);
  });

  it('accepts a valid opening and a disabled opening', () => {
    expect(OpeningIntervalSchema.safeParse({ openingStartSeconds: 34.54, openingEndSeconds: 124.54, durationSeconds: 1420 }).success).toBe(true);
    expect(OpeningIntervalSchema.safeParse({ openingStartSeconds: null, openingEndSeconds: null }).success).toBe(true);
  });

  it('rejects incomplete, reversed, and out-of-duration intervals', () => {
    expect(OpeningIntervalSchema.safeParse({ openingStartSeconds: 30, openingEndSeconds: null }).success).toBe(false);
    expect(OpeningIntervalSchema.safeParse({ openingStartSeconds: 120, openingEndSeconds: 90 }).success).toBe(false);
    expect(OpeningIntervalSchema.safeParse({ openingStartSeconds: 30, openingEndSeconds: 1500, durationSeconds: 1400 }).success).toBe(false);
  });
});
