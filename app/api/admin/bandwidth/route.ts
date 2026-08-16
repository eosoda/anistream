import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const sources = await prisma.episodeSource.findMany({
      select: {
        provider: true,
        trafficBytes: true,
        lastStatus: true,
        lastLatencyMs: true,
        enabled: true,
      },
    });

    const trafficMap: Record<
      string,
      { totalBytes: number; sourceCount: number; enabledCount: number; avgLatency: number }
    > = {};

    for (const src of sources) {
      const provider = src.provider || 'desconhecido';
      if (!trafficMap[provider]) {
        trafficMap[provider] = {
          totalBytes: 0,
          sourceCount: 0,
          enabledCount: 0,
          avgLatency: 0,
        };
      }

      trafficMap[provider].totalBytes += Number(src.trafficBytes || 0);
      trafficMap[provider].sourceCount += 1;
      if (src.enabled) trafficMap[provider].enabledCount += 1;
      trafficMap[provider].avgLatency += src.lastLatencyMs || 0;
    }

    const report = Object.entries(trafficMap).map(([provider, data]) => ({
      provider,
      totalBytes: data.totalBytes,
      totalMb: (data.totalBytes / (1024 * 1024)).toFixed(2),
      sourceCount: data.sourceCount,
      enabledCount: data.enabledCount,
      avgLatencyMs: Math.round(data.avgLatency / (data.sourceCount || 1)),
    }));

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[Admin Bandwidth Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar o relatório de banda.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await req.json();
    const { provider, action } = body;

    if (!provider || !action) {
      return NextResponse.json({ error: 'Provedor e ação são obrigatórios.' }, { status: 400 });
    }

    const enabled = action === 'enable';

    await prisma.episodeSource.updateMany({
      where: { provider },
      data: { enabled },
    });

    return NextResponse.json({
      success: true,
      message: `Status do provedor ${provider} alterado para ${enabled ? 'Ativo' : 'Pausado/Bloqueado'}.`,
    });
  } catch (error) {
    console.error('[Admin Bandwidth Mutation Error]', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o provedor.' }, { status: 500 });
  }
}
