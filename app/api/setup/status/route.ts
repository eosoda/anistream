import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateSetupKey, validateSetupKey } from '@/lib/security/setup-key';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    let dbConnected = false;
    let postgresPingMs = 0;
    let adminCount = 0;
    let animeCount = 0;
    let episodeCount = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      postgresPingMs = Date.now() - dbStart;
      dbConnected = true;

      adminCount = await prisma.adminUser.count();
      animeCount = await prisma.anime.count();
      episodeCount = await prisma.episode.count();
    } catch (err: any) {
      console.error('[Setup Status DB Error]', err);
      dbConnected = false;
    }

    const isInitialized = adminCount > 0;

    // Se ainda não inicializado, garante que a chave do setup existe nos logs
    if (!isInitialized) {
      getOrCreateSetupKey();
    }

    // Verificar se uma chave foi fornecida na query string
    const searchParams = request.nextUrl.searchParams;
    const providedKey = searchParams.get('key') || request.headers.get('x-setup-key');
    const keyValid = !isInitialized && providedKey ? validateSetupKey(providedKey) : false;

    return NextResponse.json({
      dbConnected,
      postgresPingMs,
      isInitialized,
      setupKeyRequired: !isInitialized,
      keyValid,
      stats: {
        adminCount,
        animeCount,
        episodeCount,
      },
      totalDurationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Setup Status Error]', error);
    return NextResponse.json(
      { dbConnected: false, isInitialized: false, error: 'Não foi possível consultar o status da instalação.' },
      { status: 500 }
    );
  }
}
