import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { prisma } from '@/lib/db/prisma';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import { getKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const [animeCount, episodeCount, healthLogs, settings, health] = await Promise.all([
      prisma.anime.count(),
      prisma.episode.count(),
      prisma.providerHealthLog.findMany({ take: 20, orderBy: { checkedAt: 'desc' } }),
      getKenjitsuExtensionSettings(),
      kenjitsuClient.getExtensionHealth().catch(() => ({ data: [] })),
    ]);

    const healthById = new Map((health.data || []).map((item) => [item.id, item]));
    const extensionStats = settings.map((setting) => {
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
    const enabledExtensionsCount = extensionStats.filter((extension) => extension.enabled).length;

    return NextResponse.json({
      kpis: {
        animeCount,
        episodeCount,
        totalExtensionsCount: extensionStats.length,
        enabledExtensionsCount,
        disabledExtensionsCount: extensionStats.length - enabledExtensionsCount,
        overallHealthScore: extensionStats.length ? Math.round(extensionStats.reduce((total, item) => total + item.successRate, 0) / extensionStats.length) : 0,
      },
      extensionStats,
      healthLogs,
      source: 'kenjitsu',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao calcular metricas administrativas', message: error.message }, { status: 502 });
  }
}
