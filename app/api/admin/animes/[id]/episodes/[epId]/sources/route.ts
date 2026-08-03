import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

type RouteContext = { params: Promise<{ id: string; epId: string }> };

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  return NextResponse.json(
    {
      error: 'Fontes persistidas e URLs manuais foram desativadas. Use a descoberta ao vivo do Kenjitsu.',
      source: 'kenjitsu',
    },
    { status: 410 },
  );
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const { epId } = await context.params;
    const body = await request.json();
    const { sourceId, enabled, provider, type, quality, audioLanguage, priority } = body;
    if (!sourceId) return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (typeof provider === 'string' && provider.trim()) updateData.provider = provider.trim();
    if (typeof type === 'string' && type.trim()) updateData.type = type;
    if (typeof quality === 'string' && quality.trim()) updateData.quality = quality;
    if (typeof audioLanguage === 'string' && audioLanguage.trim()) updateData.audioLanguage = audioLanguage;
    if (typeof priority === 'number') updateData.priority = priority;

    const updated = await prisma.episodeSource.update({ where: { id: sourceId }, data: updateData });
    return NextResponse.json({ success: true, episodeId: epId, source: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar fonte.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const sourceId = new URL(request.url).searchParams.get('sourceId');
    if (!sourceId) return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });
    await prisma.episodeSource.delete({ where: { id: sourceId } });
    return NextResponse.json({ success: true, message: 'Fonte removida.' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao remover fonte.' }, { status: 500 });
  }
}
