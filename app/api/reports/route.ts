import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { dispatchWebhooks } from '@/lib/webhooks/notifier';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import type { Prisma } from '@prisma/client';

// GET: Listar chamados de erro (Admin)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') || '25', 10) || 25));
    const where: Prisma.EpisodeReportWhereInput = status && status !== 'all' ? { status } : {};
    const reports = await prisma.episodeReport.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        episode: {
          include: {
            anime: { select: { title: true, slug: true } },
          },
        },
      },
    });
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Criar chamado de erro (Player pelo Usuário)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { episodeId, type = 'OTHER', description } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'ID do episódio é obrigatório.' }, { status: 400 });
    }

    const report = await prisma.episodeReport.create({
      data: {
        episodeId,
        type,
        description,
        status: 'PENDING',
      },
    });

    // Disparar notificação assíncrona para Discord/Telegram
    dispatchWebhooks({
      title: '🚨 Novo Relato de Problema em Episódio',
      description: `Um usuário reportou um problema no episódio ID: **${episodeId}**`,
      type: 'WARNING',
      fields: [
        { name: 'Tipo do Problema', value: type, inline: true },
        { name: 'Descrição', value: description || 'Sem descrição adicional', inline: false },
      ],
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Obrigado! Seu relato de problema foi enviado aos administradores.',
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Atualizar status do chamado (Admin)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 });
    }

    const updated = await prisma.episodeReport.update({
      where: { id },
      data: { status },
    });

    void recordAdminAudit({ actorId: auth.userId, action: 'report.updated', resourceType: 'episode-report', resourceId: id, summary: `Relato de episódio marcado como ${status}.`, metadata: { status } });

    return NextResponse.json({ success: true, report: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
