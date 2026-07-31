import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { OpeningIntervalSchema } from '@/schemas/episode';

type RouteContext = { params: Promise<{ id: string; epId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId, epId } = await context.params;
  const episode = await prisma.episode.findFirst({ where: { id: epId, animeId } });
  if (!episode) {
    return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = OpeningIntervalSchema.safeParse({
    openingStartSeconds: body.openingStartSeconds ?? null,
    openingEndSeconds: body.openingEndSeconds ?? null,
    durationSeconds: episode.durationSeconds && episode.durationSeconds < 300 ? episode.durationSeconds * 60 : episode.durationSeconds,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Intervalo de abertura inválido.', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.episode.update({
    where: { id: epId },
    data: {
      openingStartSeconds: parsed.data.openingStartSeconds,
      openingEndSeconds: parsed.data.openingEndSeconds,
    },
  });
  return NextResponse.json({ episode: updated });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId, epId } = await context.params;
  const episode = await prisma.episode.findFirst({ where: { id: epId, animeId } });
  if (!episode) {
    return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
  }

  await prisma.episode.delete({ where: { id: epId } });
  return NextResponse.json({ success: true, message: 'Episódio excluído com sucesso.' });
}
