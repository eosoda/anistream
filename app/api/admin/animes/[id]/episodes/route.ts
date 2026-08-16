import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { CreateEpisodeSchema } from '@/schemas/episode';
import { prisma } from '@/lib/db/prisma';
import { recordAdminAudit } from '@/lib/admin/audit';

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

    void recordAdminAudit({ actorId: auth.userId, action: 'episode.created', resourceType: 'episode', resourceId: newEpisode.id, summary: `Episódio ${newEpisode.season}x${newEpisode.number} criado.`, metadata: { animeId, title: newEpisode.title } });

    return NextResponse.json({ episode: newEpisode }, { status: 201 });
  } catch (error) {
    console.error('[Admin Episode Create Error]', error);
    return NextResponse.json(
      { error: 'Não foi possível cadastrar o episódio.' },
      { status: 500 }
    );
  }
}
