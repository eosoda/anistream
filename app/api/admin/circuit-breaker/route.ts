import { NextRequest } from 'next/server';
import { globalCircuitBreaker } from '@/lib/api/circuit-breaker';
import { apiSuccess, apiError } from '@/lib/api/response';

const MONITORED_PROVIDERS = ['kenjitsu', 'anizone', 'anikoto', 'anidb', 'anibd', 'animeheaven'];

export async function GET(request: NextRequest) {
  try {
    const statuses = MONITORED_PROVIDERS.map((provider) => ({
      provider,
      state: globalCircuitBreaker.getState(provider),
    }));

    return apiSuccess({ providers: statuses });
  } catch (err: any) {
    return apiError('ADMIN_CIRCUIT_BREAKER_ERROR', err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = body.providerName || 'kenjitsu';

    globalCircuitBreaker.recordSuccess(provider);

    return apiSuccess({
      message: `Circuito para o provedor '${provider}' foi resetado para CLOSED.`,
      provider,
      state: globalCircuitBreaker.getState(provider),
    });
  } catch (err: any) {
    return apiError('ADMIN_CIRCUIT_BREAKER_RESET_ERROR', err.message, 500);
  }
}
