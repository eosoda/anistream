import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { dispatchWebhooks } from '@/lib/webhooks/notifier';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';
import { CreateEpisodeReportSchema, UpdateEpisodeReportSchema } from '@/schemas/admin';
import type { Prisma } from '@prisma/client';
import { readJsonBodyLimited, InvalidJsonBodyError, RequestBodyTooLargeError } from '@/lib/security/body-limit';

// GET: Listar chamados de erro (Admin)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const params = new URL(request.url).searchParams;
    const rawStatus = params.get('status');
    const status = rawStatus && rawStatus !== 'all'
      ? UpdateEpisodeReportSchema.shape.status.safeParse(rawStatus)
      : null;
    if (status && !status.success) {
      return NextResponse.json({ error: 'Status de relatório inválido.' }, { status: 400 });
    }
    const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') || '25', 10) || 25));
    const where: Prisma.EpisodeReportWhereInput = status?.success ? { status: status.data } : {};
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
  } catch (error) {
    console.error('[Admin Reports Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar os relatórios.' }, { status: 500 });
  }
}

// POST: Criar chamado de erro (Player pelo Usuário)
export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkDistributedRateLimit(`public-report:${getClientIp(req)}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    }, { failClosed: true });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.backend === 'unavailable' ? 'Relatórios temporariamente indisponíveis.' : 'Muitos relatórios enviados. Tente novamente mais tarde.' },
        { status: rateLimit.backend === 'unavailable' ? 503 : 429, headers: rateLimitHeaders(rateLimit) },
      );
    }

    const parsed = CreateEpisodeReportSchema.safeParse(await readJsonBodyLimited(req, 32 * 1024));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados do relatório inválidos.' }, { status: 400 });
    }
    const { episodeId, type, description } = parsed.data;

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
    }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Relatório excede o limite permitido.' }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: 'Dados do relatório inválidos.' }, { status: 400 });
    console.error('[Public Report Create Error]', error);
    return NextResponse.json({ error: 'Não foi possível enviar o relatório.' }, { status: 500 });
  }
}

// PATCH: Atualizar status do chamado (Admin)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const parsed = UpdateEpisodeReportSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados de atualização inválidos.' }, { status: 400 });
    }
    const { id, status } = parsed.data;

    const updated = await prisma.episodeReport.update({
      where: { id },
      data: { status },
    });

    void recordAdminAudit({ actorId: auth.userId, action: 'report.updated', resourceType: 'episode-report', resourceId: id, summary: `Relato de episódio marcado como ${status}.`, metadata: { status } });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error('[Admin Report Update Error]', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o relatório.' }, { status: 500 });
  }
}
