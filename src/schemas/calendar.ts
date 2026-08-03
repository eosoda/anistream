import { z } from 'zod';

export const DEFAULT_CALENDAR_TIMEZONE = 'Asia/Tokyo';
export const DEFAULT_CALENDAR_SETTINGS = {
  autoSyncEnabled: true,
  roundingMinutes: 30 as const,
  pageEnabled: true,
};

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const timezoneSchema = z.string().trim().min(1).refine(isValidTimeZone, 'Timezone IANA inválido.');
const weekdaySchema = z.number().int().min(0).max(6).nullable().optional();
const timeMinutesSchema = z.number().int().min(0).max(1439).nullable().optional();

export const CalendarSettingsSchema = z.object({
  autoSyncEnabled: z.boolean(),
  roundingMinutes: z.union([z.literal(30), z.literal(60)]),
  pageEnabled: z.boolean(),
});

export const CalendarRuleInputSchema = z.object({
  animeId: z.string().trim().min(1),
  mode: z.enum(['ADD', 'OVERRIDE', 'HIDE']),
  weekday: weekdaySchema,
  timeMinutes: timeMinutesSchema,
  timezone: timezoneSchema,
  enabled: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.mode !== 'HIDE' && value.weekday == null) {
    context.addIssue({ code: 'custom', path: ['weekday'], message: 'Informe o dia da semana.' });
  }
  if (value.mode !== 'HIDE' && value.timeMinutes == null) {
    context.addIssue({ code: 'custom', path: ['timeMinutes'], message: 'Informe o horário.' });
  }
});

export const CalendarExceptionInputSchema = z.object({
  animeId: z.string().trim().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  mode: z.enum(['ADD', 'MOVE', 'HIDE']),
  weekday: weekdaySchema,
  timeMinutes: timeMinutesSchema,
  timezone: timezoneSchema,
  enabled: z.boolean().default(true),
}).superRefine((value, context) => {
  const parsed = new Date(`${value.dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.dateKey) {
    context.addIssue({ code: 'custom', path: ['dateKey'], message: 'Data inexistente.' });
  }
  if (value.mode !== 'HIDE' && value.weekday == null) {
    context.addIssue({ code: 'custom', path: ['weekday'], message: 'Informe o dia da semana.' });
  }
  if (value.mode !== 'HIDE' && value.timeMinutes == null) {
    context.addIssue({ code: 'custom', path: ['timeMinutes'], message: 'Informe o horário.' });
  }
});

export const CalendarRuleWriteSchema = z.object({
  id: z.string().trim().min(1).optional(),
  animeId: z.string().trim().min(1),
  mode: z.enum(['ADD', 'OVERRIDE', 'HIDE']),
  weekday: weekdaySchema,
  timeMinutes: timeMinutesSchema,
  timezone: timezoneSchema,
  enabled: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.mode !== 'HIDE' && value.weekday == null) {
    context.addIssue({ code: 'custom', path: ['weekday'], message: 'Informe o dia da semana.' });
  }
  if (value.mode !== 'HIDE' && value.timeMinutes == null) {
    context.addIssue({ code: 'custom', path: ['timeMinutes'], message: 'Informe o horário.' });
  }
});

export const CalendarExceptionWriteSchema = z.object({
  id: z.string().trim().min(1).optional(),
  animeId: z.string().trim().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  mode: z.enum(['ADD', 'MOVE', 'HIDE']),
  weekday: weekdaySchema,
  timeMinutes: timeMinutesSchema,
  timezone: timezoneSchema,
  enabled: z.boolean().default(true),
}).superRefine((value, context) => {
  const parsed = new Date(`${value.dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value.dateKey) {
    context.addIssue({ code: 'custom', path: ['dateKey'], message: 'Data inexistente.' });
  }
  if (value.mode !== 'HIDE' && value.weekday == null) {
    context.addIssue({ code: 'custom', path: ['weekday'], message: 'Informe o dia da semana.' });
  }
  if (value.mode !== 'HIDE' && value.timeMinutes == null) {
    context.addIssue({ code: 'custom', path: ['timeMinutes'], message: 'Informe o horário.' });
  }
});

export const CalendarSettingsUpdateSchema = z.object({
  settings: CalendarSettingsSchema,
});

export const CalendarWeekQuerySchema = z.object({
  timezone: timezoneSchema.optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart inválido.').optional(),
});

export type CalendarRuleInput = z.infer<typeof CalendarRuleInputSchema>;
export type CalendarExceptionInput = z.infer<typeof CalendarExceptionInputSchema>;
