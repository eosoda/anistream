import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

type RouteContext = { params: Promise<{ id: string; epId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { epId } = await context.params;
  const episode = await prisma.episode.findUnique({ where: { id: epId } });
  if (!episode) return NextResponse.json({ error: 'Episodio nao encontrado.' }, { status: 404 });

  const body = await request.json();
  const items = Array.isArray(body.sources) ? body.sources : [body];
  return NextResponse.json({
    success: true,
    message: `${items.filter((item: any) => item?.url && item?.provider).length} fonte(s) recebida(s) para uso live.`,
    persisted: false,
    sources: items.filter((item: any) => item?.url && item?.provider).map((item: any) => ({
      provider: String(item.provider).trim(),
      url: item.url,
      type: item.type || 'embed',
      quality: item.quality || 'Auto',
      audioLanguage: item.audioLanguage || 'ja',
    })),
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const body = await request.json();
    const { sourceId, enabled, provider, type, quality, audioLanguage, priority } = body;
    if (!sourceId) return NextResponse.json({ error: 'ID da fonte e obrigatorio.' }, { status: 400 });

    const updateData: any = {};
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (provider) updateData.provider = provider.trim();
    if (type) updateData.type = type;
    if (quality) updateData.quality = quality;
    if (audioLanguage) updateData.audioLanguage = audioLanguage;
    if (typeof priority === 'number') updateData.priority = priority;
    const updated = await prisma.episodeSource.update({ where: { id: sourceId }, data: updateData });
    return NextResponse.json({ success: true, message: 'Fonte atualizada.', source: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const sourceId = new URL(request.url).searchParams.get('sourceId');
    if (!sourceId) return NextResponse.json({ error: 'ID da fonte e obrigatorio.' }, { status: 400 });
    await prisma.episodeSource.delete({ where: { id: sourceId } });
    return NextResponse.json({ success: true, message: 'Fonte removida.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
