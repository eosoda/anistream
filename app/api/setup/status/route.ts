import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateSetupKey, validateSetupKey } from '@/lib/security/setup-key';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const rateLimit = await checkDistributedRateLimit(`setup:status:${getClientIp(request)}`, { limit: 30, windowMs: 60 * 1000 }, { failClosed: true });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.backend === 'unavailable' ? 'Status de setup temporariamente indisponível.' : 'Muitas consultas de setup.' },
      { status: rateLimit.backend === 'unavailable' ? 503 : 429, headers: { ...rateLimitHeaders(rateLimit), 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const admin = await prisma.adminUser.findFirst({ select: { id: true } });
    const isInitialized = Boolean(admin);
    if (!isInitialized) getOrCreateSetupKey();
    const key = request.headers.get('x-setup-key');

    return NextResponse.json(
      {
        dbConnected: true,
        isInitialized,
        setupKeyRequired: !isInitialized,
        keyValid: !isInitialized && Boolean(key) && validateSetupKey(key),
      },
      { headers: { ...rateLimitHeaders(rateLimit), 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[Setup Status Error]', error instanceof Error ? error.message : 'Falha desconhecida');
    return NextResponse.json(
      { dbConnected: false, isInitialized: false, setupKeyRequired: true, keyValid: false },
      { status: 503, headers: { ...rateLimitHeaders(rateLimit), 'Cache-Control': 'no-store' } },
    );
  }
}
