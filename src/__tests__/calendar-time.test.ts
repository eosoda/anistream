import { describe, expect, it } from 'vitest';
import {
  localScheduleParts,
  recurringScheduleInstances,
  roundScheduleTime,
  utcDateKeysForLocalWeek,
  zonedDateTimeToUtc,
} from '@/lib/calendar/time';
import {
  CalendarExceptionWriteSchema,
  CalendarRuleWriteSchema,
} from '@/schemas/calendar';

describe('release schedule time projection', () => {
  it('converts a Tokyo event to the previous local day in São Paulo', () => {
    const instant = zonedDateTimeToUtc('2025-01-05', 30, 'Asia/Tokyo');
    const projected = localScheduleParts(instant, 'America/Sao_Paulo', 30);

    expect(instant.toISOString()).toBe('2025-01-04T15:30:00.000Z');
    expect(projected.date).toBe('2025-01-04');
    expect(projected.weekday).toBe(6);
    expect(projected.time).toBe('12:30');
  });

  it('moves rounded midnight to the following local day', () => {
    const projected = localScheduleParts(new Date('2025-01-05T02:50:00.000Z'), 'America/Sao_Paulo', 30);

    expect(projected.date).toBe('2025-01-05');
    expect(projected.time).toBe('00:00');
    expect(projected.weekday).toBe(0);
  });

  it('supports both configured rounding precisions', () => {
    expect(roundScheduleTime(14, 30)).toEqual({ dateDelta: 0, timeMinutes: 0 });
    expect(roundScheduleTime(16, 30)).toEqual({ dateDelta: 0, timeMinutes: 30 });
    expect(roundScheduleTime(29, 60)).toEqual({ dateDelta: 0, timeMinutes: 0 });
    expect(roundScheduleTime(45, 60)).toEqual({ dateDelta: 0, timeMinutes: 60 });
    expect(roundScheduleTime(1439, 30)).toEqual({ dateDelta: 1, timeMinutes: 0 });
  });

  it('projects a recurring Sunday rule across a timezone day change', () => {
    const instances = recurringScheduleInstances(
      0,
      30,
      'Asia/Tokyo',
      '2024-12-29',
      'America/Sao_Paulo',
      30,
    );

    expect(instances.some((instance) => instance.date === '2025-01-04' && instance.time === '12:30')).toBe(true);
  });

  it('requests adjacent UTC dates to cover a local week', () => {
    const dates = utcDateKeysForLocalWeek('2025-01-05', 'Asia/Tokyo');

    expect(dates).toContain('2025-01-04');
    expect(dates).toContain('2025-01-12');
  });
});

describe('release schedule input contracts', () => {
  const animeId = 'anime_123';

  it('accepts a recurring rule and normalizes its default enabled state', () => {
    const result = CalendarRuleWriteSchema.safeParse({
      animeId,
      mode: 'OVERRIDE',
      weekday: 2,
      timeMinutes: 1320,
      timezone: 'Asia/Tokyo',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enabled).toBe(true);
  });

  it('allows a hide rule without an invented schedule', () => {
    const result = CalendarRuleWriteSchema.safeParse({
      animeId,
      mode: 'HIDE',
      weekday: null,
      timeMinutes: null,
      timezone: 'Asia/Tokyo',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid timezones and incomplete visible exceptions', () => {
    expect(CalendarRuleWriteSchema.safeParse({
      animeId,
      mode: 'ADD',
      weekday: 1,
      timeMinutes: 600,
      timezone: 'Not/A-Timezone',
    }).success).toBe(false);

    expect(CalendarExceptionWriteSchema.safeParse({
      animeId,
      dateKey: '2025-02-30',
      mode: 'MOVE',
      weekday: null,
      timeMinutes: null,
      timezone: 'UTC',
    }).success).toBe(false);
  });
});
