import { NextRequest, NextResponse } from 'next/server';
import { kenjitsuClient, KenjitsuRequestError } from '@/lib/kenjitsu/client';
import {
  getKenjitsuExtensionSettings,
  normalizeKenjitsuExtensionSettings,
  saveKenjitsuExtensionSettings,
} from '@/lib/kenjitsu/settings';
import { KENJITSU_EXTENSION_IDS, type KenjitsuExtensionId } from '@/lib/kenjitsu/types';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

function isExtensionId(value: unknown): value is KenjitsuExtensionId {
  return typeof value === 'string' && KENJITSU_EXTENSION_IDS.includes(value as KenjitsuExtensionId);
}

async function authorized(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  return auth.authenticated ? null : auth.errorResponse || NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const denied = await authorized(request);
  if (denied) return denied;

  const settings = await getKenjitsuExtensionSettings();
  try {
    const health = await kenjitsuClient.getExtensionHealth();
    const byId = new Map(health.data.map((item) => [item.id, item]));
    return NextResponse.json({ extensions: settings.map((setting) => ({ ...setting, manifest: byId.get(setting.id) || null })) });
  } catch (error) {
    return NextResponse.json({
      extensions: settings.map((setting) => ({ ...setting, manifest: null })),
      kenjitsuError: error instanceof Error ? error.message : 'Kenjitsu indisponível.',
    });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await authorized(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!isExtensionId(body?.id)) return NextResponse.json({ error: 'Extensão inválida.' }, { status: 400 });
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled deve ser booleano.' }, { status: 400 });
  if (body.nsfw !== undefined && typeof body.nsfw !== 'boolean') return NextResponse.json({ error: 'nsfw deve ser booleano.' }, { status: 400 });

  const settings = await getKenjitsuExtensionSettings();
  const updated = settings.map((setting) =>
    setting.id === body.id
      ? { ...setting, ...(body.enabled === undefined ? {} : { enabled: body.enabled }), ...(body.nsfw === undefined ? {} : { nsfw: body.nsfw }) }
      : setting,
  );
  await saveKenjitsuExtensionSettings(updated);
  return NextResponse.json({ success: true, extensions: updated });
}

export async function POST(request: NextRequest) {
  const denied = await authorized(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!isExtensionId(body?.id)) return NextResponse.json({ error: 'Extensão inválida.' }, { status: 400 });

  const startedAt = Date.now();
  let status: 'healthy' | 'degraded' | 'down' = 'down';
  let errorMessage: string | null = null;
  try {
    const result = await kenjitsuClient.searchExtension(body.id, 'Naruto', 1);
    status = result.data?.length ? 'healthy' : 'degraded';
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Falha no teste.';
    if (error instanceof KenjitsuRequestError && error.status < 500) status = 'degraded';
  }

  const settings = await getKenjitsuExtensionSettings();
  const updated = normalizeKenjitsuExtensionSettings(settings.map((setting) =>
    setting.id === body.id
      ? { ...setting, lastTestedAt: new Date().toISOString(), lastTestStatus: status, lastLatencyMs: Date.now() - startedAt, lastError: errorMessage }
      : setting,
  ));
  await saveKenjitsuExtensionSettings(updated);
  return NextResponse.json({ success: status !== 'down', status, latencyMs: Date.now() - startedAt, error: errorMessage });
}
