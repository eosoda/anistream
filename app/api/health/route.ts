import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/env';
import { redisPing } from '@/lib/cache/redis';

export async function GET() {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  let dbHealthy = false;
  let dbLatencyMs = 0;

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
  const isHealthy = dbHealthy && (!redisConfigured || redisHealthy);
  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    totalDurationMs: Date.now() - startTime,
    services: {
      database: { status: dbHealthy ? 'up' : 'down', latencyMs: dbLatencyMs },
      redis: { status: redisConfigured ? (redisHealthy ? 'up' : 'down') : 'not_configured' },
    },
  }, { status: isHealthy ? 200 : 503 });
}
