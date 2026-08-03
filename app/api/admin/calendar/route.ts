import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { getAdminCalendarState } from '@/lib/calendar/service';
import { saveCalendarConfiguration } from '@/lib/calendar/repository';
import { CalendarExceptionWriteSchema, CalendarRuleWriteSchema, CalendarSettingsSchema } from '@/schemas/calendar';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const timezone = request.nextUrl.searchParams.get('timezone');
    return apiSuccess(await getAdminCalendarState(timezone));
  } catch (error) {
    return apiError('ADMIN_CALENDAR_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar a configuração do calendário.', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const settings = CalendarSettingsSchema.safeParse(body?.settings);
    type RuleParse = ReturnType<typeof CalendarRuleWriteSchema.safeParse>;
    type ExceptionParse = ReturnType<typeof CalendarExceptionWriteSchema.safeParse>;
    const rules: RuleParse[] = Array.isArray(body?.rules) ? body.rules.map((rule: unknown) => CalendarRuleWriteSchema.safeParse(rule)) : [];
    const exceptions: ExceptionParse[] = Array.isArray(body?.exceptions) ? body.exceptions.map((exception: unknown) => CalendarExceptionWriteSchema.safeParse(exception)) : [];
    if (!settings.success || !Array.isArray(body?.rules) || rules.some((result) => !result.success) || !Array.isArray(body?.exceptions) || exceptions.some((result) => !result.success)) {
      return apiError('ADMIN_CALENDAR_INVALID', 'A configuração do calendário contém dados inválidos.', 400, {
        settings: settings.success ? undefined : settings.error.flatten(),
        rules: rules.filter((result) => !result.success).map((result) => result.success ? null : result.error.flatten()),
        exceptions: exceptions.filter((result) => !result.success).map((result) => result.success ? null : result.error.flatten()),
      });
    }

    await saveCalendarConfiguration({
      settings: settings.data,
      rules: rules.map((result) => result.success ? result.data : null).filter((value): value is NonNullable<typeof value> => value !== null),
      exceptions: exceptions.map((result) => result.success ? result.data : null).filter((value): value is NonNullable<typeof value> => value !== null),
    });
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'calendar.updated',
      resourceType: 'calendar',
      summary: 'Configuração do calendário semanal atualizada.',
      metadata: {
        ruleCount: body.rules.length,
        exceptionCount: body.exceptions.length,
        autoSyncEnabled: settings.data.autoSyncEnabled,
        roundingMinutes: settings.data.roundingMinutes,
        pageEnabled: settings.data.pageEnabled,
      },
    });
    return apiSuccess(await getAdminCalendarState(request.nextUrl.searchParams.get('timezone')));
  } catch (error) {
    return apiError('ADMIN_CALENDAR_SAVE_ERROR', error instanceof Error ? error.message : 'Não foi possível salvar o calendário.', 500);
  }
}
