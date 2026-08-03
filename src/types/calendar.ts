export const CALENDAR_WEEKDAYS = [
  { value: 0, label: 'Domingo', shortLabel: 'Dom' },
  { value: 1, label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 2, label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 3, label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 4, label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 5, label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 6, label: 'Sábado', shortLabel: 'Sáb' },
] as const;

export type CalendarWeekday = (typeof CALENDAR_WEEKDAYS)[number]['value'];
export type CalendarRuleMode = 'ADD' | 'OVERRIDE' | 'HIDE';
export type CalendarExceptionMode = 'ADD' | 'MOVE' | 'HIDE';
export type CalendarOrigin = 'kenjitsu' | 'manual' | 'override' | 'exception';
export type CalendarRoundingMinutes = 30 | 60;

export interface ReleaseScheduleSettings {
  autoSyncEnabled: boolean;
  roundingMinutes: CalendarRoundingMinutes;
  pageEnabled: boolean;
}

export interface ReleaseScheduleAnimeSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  posterUrl: string | null;
  anilistId: number | null;
}

export interface ReleaseScheduleRuleView {
  id: string;
  animeId: string;
  anime: ReleaseScheduleAnimeSummary;
  mode: CalendarRuleMode;
  weekday: CalendarWeekday | null;
  timeMinutes: number | null;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseScheduleExceptionView {
  id: string;
  animeId: string;
  anime: ReleaseScheduleAnimeSummary;
  dateKey: string;
  mode: CalendarExceptionMode;
  weekday: CalendarWeekday | null;
  timeMinutes: number | null;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseScheduleItem {
  id: string;
  animeId: string | null;
  anilistId: number;
  title: string;
  posterUrl: string | null;
  date: string;
  weekday: CalendarWeekday;
  time: string;
  origin: CalendarOrigin;
  approximate: true;
}

export interface ReleaseScheduleDay {
  weekday: CalendarWeekday;
  label: string;
  shortLabel: string;
  date: string;
  items: ReleaseScheduleItem[];
}

export interface ReleaseScheduleCalendar {
  timezone: string;
  weekStart: string;
  roundingMinutes: CalendarRoundingMinutes;
  state: 'healthy' | 'degraded' | 'empty';
  stale: boolean;
  warnings: string[];
  generatedAt: string;
  days: ReleaseScheduleDay[];
}

export interface ReleaseScheduleAdminState {
  settings: ReleaseScheduleSettings;
  rules: ReleaseScheduleRuleView[];
  exceptions: ReleaseScheduleExceptionView[];
  preview: ReleaseScheduleCalendar;
}
