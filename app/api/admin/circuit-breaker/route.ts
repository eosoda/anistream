import { NextRequest } from 'next/server';
import { globalCircuitBreaker } from '@/lib/api/circuit-breaker';
import { apiSuccess, apiError } from '@/lib/api/response';
import { KENJITSU_EXTENSION_IDS } from '@/lib/kenjitsu/types';

const MONITORED_EXTENSIONS = ['kenjitsu', ...KENJITSU_EXTENSION_IDS];

export async function GET(request: NextRequest) {
  try {
    const extensions = MONITORED_EXTENSIONS.map((extensionId) => ({
      extensionId,
      state: globalCircuitBreaker.getState(extensionId),
    }));

    return apiSuccess({ extensions });
  } catch (err: any) {
    return apiError('ADMIN_CIRCUIT_BREAKER_ERROR', err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const extensionId = body.extensionId || body.providerName || 'kenjitsu';

    globalCircuitBreaker.recordSuccess(extensionId);

    return apiSuccess({
      message: `Circuito da extensão '${extensionId}' foi resetado para CLOSED.`,
      extensionId,
      state: globalCircuitBreaker.getState(extensionId),
    });
  } catch (err: any) {
    return apiError('ADMIN_CIRCUIT_BREAKER_RESET_ERROR', err.message, 500);
  }
}
