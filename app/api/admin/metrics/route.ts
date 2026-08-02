import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import { getKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const [animeCount, episodeCount, totalSourcesCount, activeSourcesCount, healthLogs, recentSources, settings, health] = await Promise.all([
      prisma.anime.count(),
      prisma.episode.count(),
      prisma.episodeSource.count(),
      prisma.episodeSource.count({ where: { enabled: true } }),
      prisma.providerHealthLog.findMany({ take: 20, orderBy: { checkedAt: 'desc' } }),
      prisma.episodeSource.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { episode: { include: { anime: { select: { title: true } } } } },
      }),
      getKenjitsuExtensionSettings(),
      kenjitsuClient.getExtensionHealth().catch(() => ({ data: [] })),
    ]);

    const healthById = new Map((health.data || []).map((item) => [item.id, item]));
    const providerStats = settings.map((setting) => {
      const manifest = healthById.get(setting.id);
      const status = setting.lastTestStatus || (manifest ? 'degraded' : 'down');
      return {
        id: setting.id,
        name: manifest?.name || setting.id,
        status,
        avgLatencyMs: setting.lastLatencyMs || null,
        successRate: status === 'healthy' ? 100 : status === 'degraded' ? 50 : 0,
        enabled: setting.enabled,
      };
    });

    return NextResponse.json({
      kpis: {
        animeCount,
        episodeCount,
        totalSourcesCount,
        activeSourcesCount,
        inactiveSourcesCount: totalSourcesCount - activeSourcesCount,
        overallHealthScore: providerStats.length ? Math.round(providerStats.reduce((total, item) => total + item.successRate, 0) / providerStats.length) : 0,
      },
      providerStats,
      healthLogs,
      recentSources: recentSources.map((source: any) => ({ ...source, trafficBytes: Number(source.trafficBytes || 0) })),
      source: 'kenjitsu',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao calcular metricas administrativas', message: error.message }, { status: 502 });
  }
}
