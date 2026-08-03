import { redisGetJson, redisSetJson } from '@/lib/cache/redis';
import { env } from '@/env';
import { mapWithConcurrency } from '@/lib/kenjitsu/concurrency';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import type { KenjitsuAiringSchedule } from '@/lib/kenjitsu/types';
import { isValidTimeZone } from '@/schemas/calendar';
import type {
  ReleaseScheduleCalendar,
  ReleaseScheduleDay,
  ReleaseScheduleItem,
  ReleaseScheduleSettings,
} from '@/types/calendar';
import { CALENDAR_WEEKDAYS } from '@/types/calendar';
import {
  getCalendarSettings,
  getCalendarVersion,
  getAnimeAnilistId,
  findCalendarAnimesByAnilistIds,
  listCalendarExceptions,
  listCalendarRules,
  listAllCalendarExceptions,
  listAllCalendarRules,
  mapException,
  mapRule,
} from './repository';
import {
  addDays,
  localScheduleParts,
  localWeekStart,
  normalizeWeekStart,
  recurringScheduleInstances,
  utcDateKeysForLocalWeek,
  weekDateKeys,
  zonedDateTimeToUtc,
} from './time';
import type { CalendarExceptionRecord, CalendarRuleRecord } from './repository';

const STALE_CALENDAR_TTL_SECONDS = 86400;

interface InternalItem extends ReleaseScheduleItem {
  instant: Date;
}

interface AutomaticScheduleResult {
  items: InternalItem[];
  warnings: string[];
}

function safeTimezone(value?: string | null): string {
  return value && isValidTimeZone(value) ? value : 'America/Sao_Paulo';
}

function titleFor(event: KenjitsuAiringSchedule): string {
  return event.title?.english || event.title?.romaji || event.title?.native || 'Anime sem título';
}

async function fetchAiringDate(date: string): Promise<KenjitsuAiringSchedule[]> {
  const events: KenjitsuAiringSchedule[] = [];
  let page = 1;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await kenjitsuClient.getAiringSchedule(date, page, 50);
    if (result.error) throw new Error(result.error);
    events.push(...(Array.isArray(result.data) ? result.data : []));
    if (!result.hasNextPage || (result.lastPage != null && page >= result.lastPage)) break;
    page += 1;
  }
  return events;
}

async function fetchAutomaticSchedule(
  weekStart: string,
  timezone: string,
  roundingMinutes: ReleaseScheduleSettings['roundingMinutes'],
): Promise<AutomaticScheduleResult> {
  const dates = utcDateKeysForLocalWeek(weekStart, timezone);
  const fetched = await mapWithConcurrency(
    dates,
    async (date) => {
      try {
        return { date, events: await fetchAiringDate(date), warning: null as string | null };
      } catch (error) {
        return {
          date,
          events: [] as KenjitsuAiringSchedule[],
          warning: `Não foi possível consultar a agenda de ${date} no Kenjitsu.`,
        };
      }
    },
    { concurrency: 4 },
  );

  const warnings = fetched.flatMap((result) => result?.warning ? [result.warning] : []);
  const events = fetched.flatMap((result) => result?.events || []);
  const anilistIds = Array.from(new Set(events.map((event) => Number(event.anilistId)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const localAnimes = await findCalendarAnimesByAnilistIds(anilistIds);
  const localByAnilist = new Map<number, typeof localAnimes[number]>();
  localAnimes.forEach((anime) => {
    const anilistId = getAnimeAnilistId(anime);
    if (anilistId != null) localByAnilist.set(anilistId, anime);
  });

  const weekEnd = addDays(weekStart, 7);
  const byAnime = new Map<number, InternalItem>();
  events.forEach((event) => {
    const anilistId = Number(event.anilistId);
    const airingAt = Number(event.airingAt);
    if (!Number.isSafeInteger(anilistId) || anilistId <= 0 || !Number.isFinite(airingAt) || airingAt <= 0) return;
    const instant = new Date(airingAt * 1000);
    const local = localScheduleParts(instant, timezone, roundingMinutes);
    if (local.date < weekStart || local.date >= weekEnd) return;
    const anime = localByAnilist.get(anilistId);
    const item: InternalItem = {
      id: `kenjitsu:${anilistId}:${airingAt}`,
      animeId: anime?.id || null,
      anilistId,
      title: anime?.title || titleFor(event),
      posterUrl: anime?.posterUrl || event.image || null,
      date: local.date,
      weekday: local.weekday,
      time: local.time,
      origin: 'kenjitsu',
      approximate: true,
      instant,
    };
    const current = byAnime.get(anilistId);
    if (!current || instant.getTime() < current.instant.getTime()) byAnime.set(anilistId, item);
  });

  return { items: Array.from(byAnime.values()), warnings };
}

function manualItem(
  rule: CalendarRuleRecord,
  occurrence: { instant: Date; date: string; weekday: ReleaseScheduleItem['weekday']; time: string },
  origin: ReleaseScheduleItem['origin'],
): InternalItem | null {
  const anilistId = getAnimeAnilistId(rule.anime);
  if (anilistId == null) return null;
  return {
    id: `rule:${rule.id}:${occurrence.date}`,
    animeId: rule.animeId,
    anilistId,
    title: rule.anime.title,
    posterUrl: rule.anime.posterUrl,
    date: occurrence.date,
    weekday: occurrence.weekday,
    time: occurrence.time,
    origin,
    approximate: true,
    instant: occurrence.instant,
  };
}

function applyRecurringRules(
  automatic: InternalItem[],
  rules: CalendarRuleRecord[],
  weekStart: string,
  timezone: string,
  roundingMinutes: ReleaseScheduleSettings['roundingMinutes'],
): { items: InternalItem[]; warnings: string[] } {
  const warnings: string[] = [];
  let items = [...automatic];
  for (const rule of rules) {
    const anilistId = getAnimeAnilistId(rule.anime);
    if (anilistId == null) {
      warnings.push(`O anime “${rule.anime.title}” não possui um identificador AniList válido.`);
      continue;
    }
    items = items.filter((item) => item.animeId !== rule.animeId && item.anilistId !== anilistId);
    if (rule.mode === 'HIDE' || rule.weekday == null || rule.timeMinutes == null) continue;
    const occurrences = recurringScheduleInstances(rule.weekday as ReleaseScheduleItem['weekday'], rule.timeMinutes, rule.timezone, weekStart, timezone, roundingMinutes);
    const origin = rule.mode === 'OVERRIDE' ? 'override' : 'manual';
    occurrences.forEach((occurrence) => {
      const item = manualItem(rule, occurrence, origin);
      if (item) items.push(item);
    });
  }
  return { items, warnings };
}

function exceptionTarget(exception: CalendarExceptionRecord, timezone: string, roundingMinutes: ReleaseScheduleSettings['roundingMinutes']) {
  const instant = zonedDateTimeToUtc(exception.dateKey, exception.timeMinutes ?? 0, exception.timezone);
  return { instant, local: localScheduleParts(instant, timezone, roundingMinutes) };
}

function exceptionItem(
  exception: CalendarExceptionRecord,
  timezone: string,
  roundingMinutes: ReleaseScheduleSettings['roundingMinutes'],
): InternalItem | null {
  const anilistId = getAnimeAnilistId(exception.anime);
  if (anilistId == null || exception.timeMinutes == null) return null;
  const target = exceptionTarget(exception, timezone, roundingMinutes);
  return {
    id: `exception:${exception.id}:${target.local.date}`,
    animeId: exception.animeId,
    anilistId,
    title: exception.anime.title,
    posterUrl: exception.anime.posterUrl,
    date: target.local.date,
    weekday: target.local.weekday,
    time: target.local.time,
    origin: 'exception',
    approximate: true,
    instant: target.instant,
  };
}

function applyExceptions(
  items: InternalItem[],
  exceptions: CalendarExceptionRecord[],
  weekStart: string,
  timezone: string,
  roundingMinutes: ReleaseScheduleSettings['roundingMinutes'],
): { items: InternalItem[]; warnings: string[] } {
  const warnings: string[] = [];
  let next = [...items];
  const weekEnd = addDays(weekStart, 7);
  for (const exception of exceptions) {
    const anilistId = getAnimeAnilistId(exception.anime);
    if (anilistId == null) {
      warnings.push(`A exceção de “${exception.anime.title}” foi ignorada sem identificador AniList.`);
      continue;
    }
    const target = exceptionTarget(exception, timezone, roundingMinutes);
    if (target.local.date < weekStart || target.local.date >= weekEnd) continue;
    // Uma exceção válida ganha prioridade sobre a projeção automática e sobre
    // a regra recorrente do mesmo anime dentro da semana exibida.
    next = next.filter((item) => item.anilistId !== anilistId);
    if (exception.mode === 'HIDE') continue;
    const item = exceptionItem(exception, timezone, roundingMinutes);
    if (item) next.push(item);
    else warnings.push(`A exceção de “${exception.anime.title}” não possui horário válido.`);
  }
  return { items: next, warnings };
}

function priority(origin: ReleaseScheduleItem['origin']): number {
  return origin === 'exception' ? 4 : origin === 'override' ? 3 : origin === 'manual' ? 2 : 1;
}

function deduplicate(items: InternalItem[]): InternalItem[] {
  const byAnime = new Map<string, InternalItem>();
  items.forEach((item) => {
    const key = item.animeId || `anilist:${item.anilistId}`;
    const current = byAnime.get(key);
    if (!current || priority(item.origin) > priority(current.origin) || (priority(item.origin) === priority(current.origin) && item.instant < current.instant)) {
      byAnime.set(key, item);
    }
  });
  return Array.from(byAnime.values());
}

function buildDays(weekStart: string, items: InternalItem[]): ReleaseScheduleDay[] {
  return weekDateKeys(weekStart).map((date) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() as ReleaseScheduleDay['weekday'];
    const metadata = CALENDAR_WEEKDAYS[weekday];
    return {
      weekday,
      label: metadata.label,
      shortLabel: metadata.shortLabel,
      date,
      items: items
        .filter((item) => item.date === date)
        .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'pt-BR'))
        .map(({ instant: _instant, ...item }) => item),
    };
  });
}

export async function getReleaseScheduleCalendar(options: {
  timezone?: string | null;
  weekStart?: string | null;
  ignorePageEnabled?: boolean;
} = {}): Promise<ReleaseScheduleCalendar> {
  const timezone = safeTimezone(options.timezone);
  const requestedWeek = options.weekStart || localWeekStart(timezone);
  const weekStart = normalizeWeekStart(requestedWeek, timezone);
  const settings = await getCalendarSettings();
  const version = await getCalendarVersion();
  const cacheKey = `anistream:calendar:${version}:${timezone}:${weekStart}:${settings.roundingMinutes}:${settings.autoSyncEnabled ? 'on' : 'off'}`;

  if (!options.ignorePageEnabled && !settings.pageEnabled) {
    return {
      timezone,
      weekStart,
      roundingMinutes: settings.roundingMinutes,
      state: 'empty',
      stale: false,
      warnings: ['O calendário público está desativado no painel administrativo.'],
      generatedAt: new Date().toISOString(),
      days: buildDays(weekStart, []),
    };
  }

  const cached = await redisGetJson<ReleaseScheduleCalendar>(cacheKey);
  if (cached) return cached;

  let items: InternalItem[] = [];
  const warnings: string[] = [];
  if (settings.autoSyncEnabled) {
    const automatic = await fetchAutomaticSchedule(weekStart, timezone, settings.roundingMinutes);
    items = automatic.items;
    warnings.push(...automatic.warnings);
  }

  const [rules, exceptions] = await Promise.all([
    listCalendarRules(),
    // Exceções são gravadas no fuso de origem; não limitar a consulta às datas
    // do visitante evita perder eventos que cruzam a meia-noite na conversão.
    listCalendarExceptions(),
  ]);
  const appliedRules = applyRecurringRules(items, rules, weekStart, timezone, settings.roundingMinutes);
  items = appliedRules.items;
  warnings.push(...appliedRules.warnings);
  const appliedExceptions = applyExceptions(items, exceptions, weekStart, timezone, settings.roundingMinutes);
  items = deduplicate(appliedExceptions.items);
  warnings.push(...appliedExceptions.warnings);

  const calendar: ReleaseScheduleCalendar = {
    timezone,
    weekStart,
    roundingMinutes: settings.roundingMinutes,
    state: warnings.length ? 'degraded' : items.length ? 'healthy' : 'empty',
    stale: false,
    warnings: Array.from(new Set(warnings)),
    generatedAt: new Date().toISOString(),
    days: buildDays(weekStart, items),
  };
  await redisSetJson(cacheKey, calendar, env.CALENDAR_CACHE_TTL_SECONDS);
  await redisSetJson(`${cacheKey}:stale`, calendar, Math.max(STALE_CALENDAR_TTL_SECONDS, env.CALENDAR_CACHE_TTL_SECONDS));
  return calendar;
}

export async function getAdminCalendarState(timezone?: string | null) {
  const [settings, rules, exceptions, preview] = await Promise.all([
    getCalendarSettings(),
    listAllCalendarRules(),
    listAllCalendarExceptions(),
    getReleaseScheduleCalendar({ timezone, ignorePageEnabled: true }),
  ]);
  return {
    settings,
    rules: rules.map(mapRule),
    exceptions: exceptions.map(mapException),
    preview,
  };
}
