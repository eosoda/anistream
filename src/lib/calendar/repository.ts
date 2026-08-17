import { prisma } from '@/lib/db/prisma';
import { DEFAULT_CALENDAR_SETTINGS } from '@/schemas/calendar';
import type { CalendarExceptionInput, CalendarRuleInput } from '@/schemas/calendar';
import type {
  ReleaseScheduleAnimeSummary,
  ReleaseScheduleExceptionView,
  ReleaseScheduleRuleView,
  ReleaseScheduleSettings,
} from '@/types/calendar';
import type { Prisma } from '@prisma/client';
import { toPlainText } from '@/utils/formatters';

export const CALENDAR_SETTINGS_KEY = 'calendar_settings';
export const CALENDAR_VERSION_KEY = 'calendar_version';
type CalendarTransaction = Pick<Prisma.TransactionClient, 'systemSetting'>;

const animeSelect = {
  id: true,
  title: true,
  originalTitle: true,
  posterUrl: true,
  identifiers: {
    select: { provider: true, value: true },
  },
} satisfies Prisma.AnimeSelect;

export type CalendarAnimeRecord = Prisma.AnimeGetPayload<{ select: typeof animeSelect }>;
export type CalendarRuleRecord = Prisma.ReleaseScheduleRuleGetPayload<{ include: { anime: { select: typeof animeSelect } } }>;
export type CalendarExceptionRecord = Prisma.ReleaseScheduleExceptionGetPayload<{ include: { anime: { select: typeof animeSelect } } }>;

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getAnimeAnilistId(anime: CalendarAnimeRecord): number | null {
  const identifier = anime.identifiers.find((item) => ['anilist', 'kenjitsu'].includes(item.provider.toLowerCase()) && /^\d+$/.test(item.value));
  return identifier ? Number(identifier.value) : null;
}

export function toAnimeSummary(anime: CalendarAnimeRecord): ReleaseScheduleAnimeSummary {
  return {
    id: anime.id,
    title: toPlainText(anime.title) || 'Anime',
    originalTitle: toPlainText(anime.originalTitle),
    posterUrl: anime.posterUrl,
    anilistId: getAnimeAnilistId(anime),
  };
}

export function mapRule(rule: CalendarRuleRecord): ReleaseScheduleRuleView {
  return {
    id: rule.id,
    animeId: rule.animeId,
    anime: toAnimeSummary(rule.anime),
    mode: rule.mode as ReleaseScheduleRuleView['mode'],
    weekday: rule.weekday as ReleaseScheduleRuleView['weekday'],
    timeMinutes: rule.timeMinutes,
    timezone: rule.timezone,
    enabled: rule.enabled,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export function mapException(exception: CalendarExceptionRecord): ReleaseScheduleExceptionView {
  return {
    id: exception.id,
    animeId: exception.animeId,
    anime: toAnimeSummary(exception.anime),
    dateKey: exception.dateKey,
    mode: exception.mode as ReleaseScheduleExceptionView['mode'],
    weekday: exception.weekday as ReleaseScheduleExceptionView['weekday'],
    timeMinutes: exception.timeMinutes,
    timezone: exception.timezone,
    enabled: exception.enabled,
    createdAt: exception.createdAt.toISOString(),
    updatedAt: exception.updatedAt.toISOString(),
  };
}

export async function getCalendarSettings(): Promise<ReleaseScheduleSettings> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: CALENDAR_SETTINGS_KEY } });
  const parsed = parseJson<Partial<ReleaseScheduleSettings>>(setting?.value);
  return {
    ...DEFAULT_CALENDAR_SETTINGS,
    ...(parsed || {}),
    roundingMinutes: parsed?.roundingMinutes === 60 ? 60 : 30,
    autoSyncEnabled: parsed?.autoSyncEnabled !== false,
    pageEnabled: parsed?.pageEnabled !== false,
  };
}

export async function getCalendarVersion(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: CALENDAR_VERSION_KEY } });
  return setting?.value || '0';
}

export async function touchCalendarVersion(transaction: CalendarTransaction = prisma): Promise<string> {
  const value = String(Date.now());
  await transaction.systemSetting.upsert({
    where: { key: CALENDAR_VERSION_KEY },
    update: { value },
    create: { key: CALENDAR_VERSION_KEY, value },
  });
  return value;
}

export async function listCalendarRules(): Promise<CalendarRuleRecord[]> {
  return prisma.releaseScheduleRule.findMany({
    where: { enabled: true },
    orderBy: [{ weekday: 'asc' }, { timeMinutes: 'asc' }, { updatedAt: 'desc' }],
    include: { anime: { select: animeSelect } },
  });
}

export async function listAllCalendarRules(): Promise<CalendarRuleRecord[]> {
  return prisma.releaseScheduleRule.findMany({
    orderBy: [{ weekday: 'asc' }, { timeMinutes: 'asc' }, { updatedAt: 'desc' }],
    include: { anime: { select: animeSelect } },
  });
}

export async function listCalendarExceptions(dateKeys?: string[]): Promise<CalendarExceptionRecord[]> {
  return prisma.releaseScheduleException.findMany({
    where: {
      enabled: true,
      ...(dateKeys?.length ? { dateKey: { in: dateKeys } } : {}),
    },
    orderBy: [{ dateKey: 'asc' }, { updatedAt: 'desc' }],
    include: { anime: { select: animeSelect } },
  });
}

export async function listAllCalendarExceptions(): Promise<CalendarExceptionRecord[]> {
  return prisma.releaseScheduleException.findMany({
    orderBy: [{ dateKey: 'asc' }, { updatedAt: 'desc' }],
    include: { anime: { select: animeSelect } },
  });
}

export async function findCalendarAnime(animeId: string): Promise<CalendarAnimeRecord | null> {
  return prisma.anime.findUnique({ where: { id: animeId }, select: animeSelect });
}

export async function findCalendarAnimesByAnilistIds(anilistIds: number[]): Promise<CalendarAnimeRecord[]> {
  if (!anilistIds.length) return [];
  return prisma.anime.findMany({
    where: {
      identifiers: {
        some: {
          provider: { in: ['anilist', 'kenjitsu'] },
          value: { in: anilistIds.map(String) },
        },
      },
    },
    select: animeSelect,
  });
}

export interface CalendarRuleWrite extends CalendarRuleInput {
  id?: string;
}

export interface CalendarExceptionWrite extends CalendarExceptionInput {
  id?: string;
}

export async function saveCalendarConfiguration(input: {
  settings: ReleaseScheduleSettings;
  rules: CalendarRuleWrite[];
  exceptions: CalendarExceptionWrite[];
}): Promise<void> {
  const animeIds = Array.from(new Set([
    ...input.rules.map((rule) => rule.animeId),
    ...input.exceptions.map((exception) => exception.animeId),
  ]));
  const animes = animeIds.length
    ? await prisma.anime.findMany({ where: { id: { in: animeIds } }, select: animeSelect })
    : [];
  const animeMap = new Map(animes.map((anime) => [anime.id, anime]));
  const missingAnime = animeIds.find((animeId) => !animeMap.has(animeId));
  if (missingAnime) throw new Error('Um dos animes selecionados não existe no catálogo local.');
  const withoutAnilist = animes.find((anime) => getAnimeAnilistId(anime) == null);
  if (withoutAnilist) throw new Error(`O anime “${withoutAnilist.title}” não possui identificador AniList.`);

  const ruleAnimeIds = new Set<string>();
  input.rules.forEach((rule) => {
    if (ruleAnimeIds.has(rule.animeId)) throw new Error('Cada anime pode ter apenas uma regra semanal ativa.');
    ruleAnimeIds.add(rule.animeId);
  });
  const exceptionKeys = new Set<string>();
  input.exceptions.forEach((exception) => {
    const key = `${exception.animeId}:${exception.dateKey}`;
    if (exceptionKeys.has(key)) throw new Error('Não é possível cadastrar duas exceções para o mesmo anime e data.');
    exceptionKeys.add(key);
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.systemSetting.upsert({
      where: { key: CALENDAR_SETTINGS_KEY },
      update: { value: JSON.stringify(input.settings) },
      create: { key: CALENDAR_SETTINGS_KEY, value: JSON.stringify(input.settings) },
    });

    const savedRuleIds: string[] = [];
    for (const rule of input.rules) {
      const data = {
        animeId: rule.animeId,
        mode: rule.mode,
        weekday: rule.weekday ?? null,
        timeMinutes: rule.timeMinutes ?? null,
        timezone: rule.timezone,
        enabled: rule.enabled,
      };
      const saved = rule.id
        ? await transaction.releaseScheduleRule.update({ where: { id: rule.id }, data })
        : await transaction.releaseScheduleRule.upsert({ where: { animeId: rule.animeId }, update: data, create: data });
      savedRuleIds.push(saved.id);
    }
    await transaction.releaseScheduleRule.deleteMany({
      where: savedRuleIds.length ? { id: { notIn: savedRuleIds } } : {},
    });

    const savedExceptionIds: string[] = [];
    for (const exception of input.exceptions) {
      const data = {
        animeId: exception.animeId,
        dateKey: exception.dateKey,
        mode: exception.mode,
        weekday: exception.weekday ?? null,
        timeMinutes: exception.timeMinutes ?? null,
        timezone: exception.timezone,
        enabled: exception.enabled,
      };
      const saved = exception.id
        ? await transaction.releaseScheduleException.update({ where: { id: exception.id }, data })
        : await transaction.releaseScheduleException.upsert({
            where: { animeId_dateKey: { animeId: exception.animeId, dateKey: exception.dateKey } },
            update: data,
            create: data,
          });
      savedExceptionIds.push(saved.id);
    }
    await transaction.releaseScheduleException.deleteMany({
      where: savedExceptionIds.length ? { id: { notIn: savedExceptionIds } } : {},
    });
    await touchCalendarVersion(transaction);
  });
}
