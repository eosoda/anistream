import type { CalendarRoundingMinutes, CalendarWeekday } from '@/types/calendar';

export const DEFAULT_DISPLAY_TIMEZONE = 'America/Sao_Paulo';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number => {
  const value = parts.find((item) => item.type === type)?.value;
  return Number(value || 0);
};

export function dateKeyParts(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
}

export function addDays(dateKey: string, amount: number): string {
  const { year, month, day } = dateKeyParts(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function weekdayForDateKey(dateKey: string): CalendarWeekday {
  const { year, month, day } = dateKeyParts(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as CalendarWeekday;
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: part(parts, 'year'),
    month: part(parts, 'month'),
    day: part(parts, 'day'),
    hour: part(parts, 'hour'),
    minute: part(parts, 'minute'),
    second: part(parts, 'second'),
  };
}

export function dateKeyFromZonedDate(date: Date, timezone: string): string {
  const parts = getZonedParts(date, timezone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function timezoneOffsetMs(date: Date, timezone: string): number {
  const parts = getZonedParts(date, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(dateKey: string, timeMinutes: number, timezone: string): Date {
  const { year, month, day } = dateKeyParts(dateKey);
  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;
  const localCandidate = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const firstUtc = new Date(localCandidate - timezoneOffsetMs(new Date(localCandidate), timezone));
  const secondOffset = timezoneOffsetMs(firstUtc, timezone);
  return new Date(localCandidate - secondOffset);
}

export function localWeekStart(timezone: string, now = new Date()): string {
  const today = dateKeyFromZonedDate(now, timezone);
  return addDays(today, -weekdayForDateKey(today));
}

export function normalizeWeekStart(dateKey: string, timezone: string): string {
  // The timezone argument intentionally validates the caller's choice before
  // normalizing the date, even though a date-only week starts at local midnight.
  new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  return addDays(dateKey, -weekdayForDateKey(dateKey));
}

export function weekDateKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function utcDateKeysForLocalWeek(weekStart: string, timezone: string): string[] {
  const startUtc = zonedDateTimeToUtc(weekStart, 0, timezone).getTime() - 86400000;
  const endUtc = zonedDateTimeToUtc(addDays(weekStart, 7), 0, timezone).getTime() + 86400000;
  const keys: string[] = [];
  for (let cursor = new Date(startUtc); cursor.getTime() <= endUtc; cursor = new Date(cursor.getTime() + 86400000)) {
    keys.push(cursor.toISOString().slice(0, 10));
  }
  return Array.from(new Set(keys));
}

export function roundScheduleTime(minutes: number, rounding: CalendarRoundingMinutes): { dateDelta: number; timeMinutes: number } {
  const rounded = Math.round(minutes / rounding) * rounding;
  if (rounded >= 1440) return { dateDelta: 1, timeMinutes: 0 };
  return { dateDelta: 0, timeMinutes: rounded };
}

export function localScheduleParts(
  instant: Date,
  timezone: string,
  rounding: CalendarRoundingMinutes,
): { date: string; weekday: CalendarWeekday; timeMinutes: number; time: string } {
  const parts = getZonedParts(instant, timezone);
  const rawMinutes = parts.hour * 60 + parts.minute;
  const rounded = roundScheduleTime(rawMinutes, rounding);
  const rawDate = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  const date = addDays(rawDate, rounded.dateDelta);
  const hours = Math.floor(rounded.timeMinutes / 60);
  const minutes = rounded.timeMinutes % 60;
  return {
    date,
    weekday: weekdayForDateKey(date),
    timeMinutes: rounded.timeMinutes,
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

export function recurringScheduleInstances(
  weekday: CalendarWeekday,
  timeMinutes: number,
  sourceTimezone: string,
  viewerWeekStart: string,
  viewerTimezone: string,
  rounding: CalendarRoundingMinutes,
): Array<{ instant: Date; date: string; weekday: CalendarWeekday; timeMinutes: number; time: string }> {
  const start = addDays(viewerWeekStart, -14);
  const end = addDays(viewerWeekStart, 21);
  const instances: Array<{ instant: Date; date: string; weekday: CalendarWeekday; timeMinutes: number; time: string }> = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (weekdayForDateKey(cursor) !== weekday) continue;
    const instant = zonedDateTimeToUtc(cursor, timeMinutes, sourceTimezone);
    const local = localScheduleParts(instant, viewerTimezone, rounding);
    if (local.date < viewerWeekStart || local.date >= addDays(viewerWeekStart, 7)) continue;
    instances.push({ instant, ...local });
  }
  return instances;
}

export function formatTimeMinutes(timeMinutes: number): string {
  return `${String(Math.floor(timeMinutes / 60)).padStart(2, '0')}:${String(timeMinutes % 60).padStart(2, '0')}`;
}
