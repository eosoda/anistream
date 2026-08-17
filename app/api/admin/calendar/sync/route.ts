import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { getAdminCalendarState } from '@/lib/calendar/service';
import { touchCalendarVersion } from '@/lib/calendar/repository';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    await touchCalendarVersion();
    const body = await request.json().catch(() => ({}));
    const state = await getAdminCalendarState(typeof body?.timezone === 'string' ? body.timezone : undefined);
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'calendar.sync_requested',
      resourceType: 'calendar',
      summary: 'Sincronização manual do calendário solicitada.',
      metadata: { timezone: state.preview.timezone, state: state.preview.state, warningCount: state.preview.warnings.length },
    });
    return apiSuccess(state);
  } catch (error) {
    console.error('[Admin Calendar Sync Error]', error);
    return apiError('ADMIN_CALENDAR_SYNC_ERROR', 'Não foi possível sincronizar o calendário.', 502);
  }
}
