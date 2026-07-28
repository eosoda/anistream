import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const startTime = Date.now();

  try {
    let dbConnected = false;
    let postgresPingMs = 0;
    let adminCount = 0;
    let animeCount = 0;
    let episodeCount = 0;
    let sourceCount = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      postgresPingMs = Date.now() - dbStart;
      dbConnected = true;

      adminCount = await prisma.adminUser.count();
      animeCount = await prisma.anime.count();
      episodeCount = await prisma.episode.count();
      sourceCount = await prisma.episodeSource.count();
    } catch {
      dbConnected = false;
    }

    return NextResponse.json({
      dbConnected,
      postgresPingMs,
      isInitialized: adminCount > 0,
      stats: {
        adminCount,
        animeCount,
        episodeCount,
        sourceCount,
      },
      totalDurationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    return NextResponse.json(
      { dbConnected: false, isInitialized: false, error: err.message },
      { status: 500 }
    );
  }
}
