import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const anime = await prisma.anime.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
      include: {
        aliases: true,
        identifiers: true,
      },
    });

    if (!anime) {
      return NextResponse.json(
        { error: 'Anime não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ anime });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao obter anime', message: err.message },
      { status: 500 }
    );
  }
}
