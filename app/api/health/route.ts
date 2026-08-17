import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/env';
import { redisPing } from '@/lib/cache/redis';
import { kenjitsuClient } from '@/lib/kenjitsu/client';

export async function GET() {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  let dbHealthy = false;
  let dbLatencyMs = 0;
  let kenjitsuHealthy = false;
  let kenjitsuLatencyMs = 0;
  let kenjitsuExtensionCount = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const redisConfigured = Boolean(env.REDIS_URL);
  const redisHealthy = redisConfigured ? await redisPing() : false;

  try {
    const kenjitsuStart = Date.now();
    const healthCheck = kenjitsuClient.getExtensionHealth();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Kenjitsu health timeout')), Math.min(env.KENJITSU_REQUEST_TIMEOUT_MS, 5000));
    });
    const result = await Promise.race([healthCheck, timeout]).finally(() => { if (timeoutId) clearTimeout(timeoutId); });
    kenjitsuLatencyMs = Date.now() - kenjitsuStart;
    kenjitsuExtensionCount = Array.isArray(result.data) ? result.data.length : 0;
    kenjitsuHealthy = kenjitsuExtensionCount > 0;
  } catch {
    kenjitsuHealthy = false;
  }

  const isHealthy = dbHealthy && redisHealthy && kenjitsuHealthy;
  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    totalDurationMs: Date.now() - startTime,
    services: {
      database: { status: dbHealthy ? 'up' : 'down', latencyMs: dbLatencyMs },
      redis: { status: redisConfigured ? (redisHealthy ? 'up' : 'down') : 'not_configured' },
      kenjitsu: {
        status: kenjitsuHealthy ? 'up' : 'down',
        latencyMs: kenjitsuLatencyMs,
        extensionCount: kenjitsuExtensionCount,
      },
    },
  }, { status: isHealthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
