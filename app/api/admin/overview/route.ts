import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import { getKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';
import { parseAuditMetadata } from '@/lib/admin/audit';
import type { AdminHealthState } from '@/types/admin';

function healthFromSetting(status?: string | null): AdminHealthState {
  return status === 'healthy' || status === 'degraded' || status === 'down' ? status : 'unknown';
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const generatedAt = new Date().toISOString();
  const dbStartedAt = Date.now();
  const kenjitsuStartedAt = Date.now();

  const [database, settings, reports, healthResult, auditResult, counts] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => ({ status: 'healthy' as const, latencyMs: Date.now() - dbStartedAt, detail: null }))
      .catch((error: unknown) => ({
        status: 'down' as const,
        latencyMs: Date.now() - dbStartedAt,
        detail: error instanceof Error ? error.message : 'Banco indisponível.',
      })),
    getKenjitsuExtensionSettings(),
    prisma.episodeReport.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { episode: { include: { anime: { select: { title: true } } } } },
    }),
    kenjitsuClient.getExtensionHealth()
      .then((response) => ({ response, error: null }))
      .catch((error: unknown) => ({ response: null, error })),
    prisma.adminAuditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
    Promise.all([prisma.anime.count(), prisma.episode.count()]).catch(() => [0, 0] as [number, number]),
  ]);

  const health = healthResult.response?.data || [];
  const healthById = new Map(health.map((item) => [item.id, item]));
  const extensions = settings.map((setting) => {
    const manifest = healthById.get(setting.id);
    const status = healthFromSetting(setting.lastTestStatus) !== 'unknown'
      ? healthFromSetting(setting.lastTestStatus)
      : manifest
        ? 'healthy'
        : healthResult.error
          ? 'down'
          : 'unknown';
    return {
      id: setting.id,
      name: manifest?.name || setting.id,
      enabled: setting.enabled,
      nsfw: setting.nsfw,
      status,
      latencyMs: setting.lastLatencyMs ?? null,
      lastTestedAt: setting.lastTestedAt ?? null,
      lastError: setting.lastError ?? null,
      source: manifest?.source || null,
      capabilities: manifest?.capabilities || [],
    };
  });

  const healthyExtensions = extensions.filter((item) => item.status === 'healthy').length;
  const overallHealthScore = extensions.length ? Math.round((healthyExtensions / extensions.length) * 100) : 0;

  return NextResponse.json({
    generatedAt,
    kpis: {
      animeCount: counts[0],
      episodeCount: counts[1],
      totalExtensionsCount: extensions.length,
      enabledExtensionsCount: extensions.filter((item) => item.enabled).length,
      pendingAlertsCount: reports.length,
      overallHealthScore,
    },
    services: [
      { id: 'database', label: 'Banco de dados', status: database.status, checkedAt: generatedAt, latencyMs: database.latencyMs, detail: database.detail },
      {
        id: 'kenjitsu',
        label: 'Kenjitsu',
        status: healthResult.error ? 'down' : 'healthy',
        checkedAt: generatedAt,
        latencyMs: Date.now() - kenjitsuStartedAt,
        detail: healthResult.error instanceof Error ? healthResult.error.message : null,
      },
    ],
    extensions,
    alerts: reports.map((report) => ({
      id: report.id,
      type: report.type,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      animeTitle: report.episode.anime.title,
      episodeNumber: report.episode.number,
      description: report.description,
    })),
    activity: auditResult.map((entry) => ({
      id: entry.id,
      actorId: entry.actorId,
      actorName: entry.actor?.name || entry.actor?.email || (entry.actorId ? 'Administrador' : 'Sistema'),
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      summary: entry.summary,
      metadata: parseAuditMetadata(entry.metadataJson),
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
