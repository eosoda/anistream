import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const episodeId = new URL(request.url).searchParams.get('episodeId');

  try {
    const sources = await prisma.episodeSource.findMany({
      where: episodeId ? { episodeId } : undefined,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { episode: { select: { title: true, number: true, season: true } } },
    });

    return NextResponse.json({
      sources: sources.map((source: any) => ({
        ...source,
        trafficBytes: Number(source.trafficBytes || 0),
      })),
      source: 'kenjitsu',
    });
  } catch (error) {
    console.error('[Admin Sources Read Error]', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as fontes.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  return NextResponse.json(
    {
      error: 'Fontes manuais foram desativadas. Use a descoberta ao vivo e as extensões do Kenjitsu.',
      source: 'kenjitsu',
    },
    { status: 410 },
  );
}
