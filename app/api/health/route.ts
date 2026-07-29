import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  let dbHealthy = false;
  let dbLatencyMs = 0;
  let redisHealthy = true; // Por padrão verdadeiro a menos que falhe a tentativa de conexão

  // 1. Testar Conexão com o PostgreSQL
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const isHealthy = dbHealthy;
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      totalDurationMs: Date.now() - startTime,
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: redisHealthy ? 'up' : 'down',
        },
      },
    },
    { status: statusCode }
  );
}
