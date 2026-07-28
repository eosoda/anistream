import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ animeId: string }> }
) {
  const { animeId } = await params;
  const { searchParams } = new URL(request.url);
  const seasonParam = searchParams.get('season') || '1';
  const season = parseInt(seasonParam, 10);

  try {
    const episodes = await prisma.episode.findMany({
      where: {
        animeId,
        season,
      },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({ season, episodes });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao listar episódios', message: err.message },
      { status: 500 }
    );
  }
}
