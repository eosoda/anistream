import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { isValidTimeZone } from '@/schemas/calendar';
import { getReleaseScheduleCalendar } from '@/lib/calendar/service';

function validDateKey(value: string | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const weekStart = searchParams.get('weekStart');
  if (weekStart && !validDateKey(weekStart)) {
    return apiError('CALENDAR_INVALID_WEEK', 'A semana informada é inválida.', 400);
  }

  const requestedTimezone = searchParams.get('timezone');
  const timezone = requestedTimezone && isValidTimeZone(requestedTimezone) ? requestedTimezone : undefined;

  try {
    const calendar = await getReleaseScheduleCalendar({ timezone, weekStart });
    return apiSuccess(calendar, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('[Calendar Fetch Error]', error);
    return apiError(
      'CALENDAR_FETCH_ERROR',
      'Não foi possível carregar o calendário.',
      502,
    );
  }
}
