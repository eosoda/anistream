import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { encryptData } from '@/lib/security/crypto';

// POST: Cadastrar novas fontes (manual ou em lote selecionadas)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { epId } = await context.params;

  try {
    const body = await request.json();
    const episode = await prisma.episode.findUnique({ where: { id: epId } });

    if (!episode) {
      return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
    }

    const itemsToInsert = Array.isArray(body.sources) ? body.sources : [body];
    const createdSources = [];

    for (const item of itemsToInsert) {
      if (!item.url || !item.provider) continue;

      const sourceId = `src-${epId}-${item.provider}-${Math.random().toString(36).substring(2, 7)}`;
      const urlEncrypted = encryptData(item.url.trim());

      const created = await prisma.episodeSource.create({
        data: {
          id: sourceId,
          episodeId: epId,
          provider: item.provider.trim(),
          urlEncrypted,
          type: item.type || (item.url.includes('.m3u8') ? 'hls' : item.url.includes('.mp4') ? 'mp4' : 'embed'),
          quality: item.quality || 'Auto',
          audioLanguage: item.audioLanguage || 'ja',
          enabled: item.enabled !== false,
          priority: item.priority || 10,
        },
      });

      createdSources.push(created);
    }

    return NextResponse.json({
      success: true,
      message: `${createdSources.length} fonte(s) cadastrada(s) com sucesso!`,
      sources: createdSources,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Atualizar propriedades de uma fonte (enabled, provider, quality, audioLanguage, url)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { sourceId, enabled, provider, url, type, quality, audioLanguage, priority } = body;

    if (!sourceId) {
      return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (provider) updateData.provider = provider.trim();
    if (url) updateData.urlEncrypted = encryptData(url.trim());
    if (type) updateData.type = type;
    if (quality) updateData.quality = quality;
    if (audioLanguage) updateData.audioLanguage = audioLanguage;
    if (typeof priority === 'number') updateData.priority = priority;

    const updated = await prisma.episodeSource.update({
      where: { id: sourceId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Fonte atualizada com sucesso!',
      source: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Excluir uma fonte do episódio
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json({ error: 'ID da fonte é obrigatório.' }, { status: 400 });
    }

    await prisma.episodeSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({
      success: true,
      message: 'Fonte excluída com sucesso!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
