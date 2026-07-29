import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { CreateEpisodeSchema } from '@/schemas/episode';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await params;

  try {
    const body = await request.json();
    const parseResult = CreateEpisodeSchema.safeParse({ ...body, animeId });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados do episódio inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const newEpisode = await prisma.episode.create({
      data: {
        animeId,
        season: data.season,
        number: data.number,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        durationSeconds: data.durationSeconds,
      },
    });

    return NextResponse.json({ episode: newEpisode }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao cadastrar episódio', message: err.message },
      { status: 500 }
    );
  }
}
