import { NextRequest } from 'next/server';
import { globalCircuitBreaker } from '@/lib/api/circuit-breaker';
import { apiSuccess, apiError } from '@/lib/api/response';
import { KENJITSU_EXTENSION_IDS } from '@/lib/kenjitsu/types';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

const MONITORED_EXTENSIONS = ['kenjitsu', ...KENJITSU_EXTENSION_IDS];

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const extensions = MONITORED_EXTENSIONS.map((extensionId) => ({
      extensionId,
      state: globalCircuitBreaker.getState(extensionId),
    }));

    return apiSuccess({ extensions });
  } catch (error) {
    console.error('[Admin Circuit Breaker Error]', error);
    return apiError('ADMIN_CIRCUIT_BREAKER_ERROR', 'Não foi possível consultar o circuito.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const extensionId = body.extensionId || body.providerName || 'kenjitsu';

    globalCircuitBreaker.recordSuccess(extensionId);

    return apiSuccess({
      message: `Circuito da extensão '${extensionId}' foi resetado para CLOSED.`,
      extensionId,
      state: globalCircuitBreaker.getState(extensionId),
    });
  } catch (error) {
    console.error('[Admin Circuit Breaker Reset Error]', error);
    return apiError('ADMIN_CIRCUIT_BREAKER_RESET_ERROR', 'Não foi possível resetar o circuito.', 500);
  }
}
