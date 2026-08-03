import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { kenjitsuClient, KenjitsuRequestError } from '@/lib/kenjitsu/client';
import { KENJITSU_EXTENSION_IDS, type KenjitsuExtensionId } from '@/lib/kenjitsu/types';
import { getKenjitsuExtensionSettings, saveKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';
import { prisma } from '@/lib/db/prisma';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const id = String(body.id || '') as KenjitsuExtensionId;
    if (!KENJITSU_EXTENSION_IDS.includes(id)) return NextResponse.json({ error: 'Extensao Kenjitsu invalida.' }, { status: 400 });

    const startedAt = Date.now();
    let ok = false;
    let status = 200;
    let error: string | null = null;
    try {
      const response = await kenjitsuClient.searchExtension(id, 'Naruto');
      ok = Array.isArray(response.data) && response.data.length > 0;
      status = ok ? 200 : 204;
    } catch (caught) {
      const failure = caught as KenjitsuRequestError;
      status = failure instanceof KenjitsuRequestError ? failure.status : 502;
      error = failure instanceof Error ? failure.message : 'Falha ao testar a extensao.';
    }

    const latencyMs = Date.now() - startedAt;
    const healthStatus = ok ? 'healthy' : error ? 'down' : 'degraded';
    await prisma.providerHealthLog.create({ data: { provider: id, status: healthStatus, latencyMs, error } }).catch(() => undefined);
    const settings = await getKenjitsuExtensionSettings();
    await saveKenjitsuExtensionSettings(settings.map((setting) =>
      setting.id === id
        ? {
            ...setting,
            lastTestedAt: new Date().toISOString(),
            lastTestStatus: healthStatus,
            lastLatencyMs: latencyMs,
            lastError: error,
          }
        : setting,
    ));
    void recordAdminAudit({ actorId: auth.userId, action: 'extension.tested', resourceType: 'extension', resourceId: id, summary: `Teste da extensão “${id}”: ${healthStatus}.`, metadata: { status: healthStatus, latencyMs, error } });

    return NextResponse.json({ success: true, ok, status, latencyMs, error, testedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
