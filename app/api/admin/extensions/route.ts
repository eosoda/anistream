import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { kenjitsuClient, KenjitsuRequestError } from '@/lib/kenjitsu/client';
import {
  getKenjitsuExtensionSettings,
  normalizeKenjitsuExtensionSettings,
  saveKenjitsuExtensionSettings,
} from '@/lib/kenjitsu/settings';
import { resolveKenjitsuExtensionInfo } from '@/lib/kenjitsu/catalog';
import { KENJITSU_EXTENSION_IDS, type KenjitsuExtensionId } from '@/lib/kenjitsu/types';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import type { AdminHealthState } from '@/types/admin';

function isExtensionId(value: unknown): value is KenjitsuExtensionId {
  return typeof value === 'string' && KENJITSU_EXTENSION_IDS.includes(value as KenjitsuExtensionId);
}

function extensionStatus(setting: { lastTestStatus?: string | null }, manifest: { id: string } | undefined, kenjitsuError: boolean): AdminHealthState {
  if (setting.lastTestStatus === 'healthy' || setting.lastTestStatus === 'degraded' || setting.lastTestStatus === 'down' || setting.lastTestStatus === 'unknown') return setting.lastTestStatus;
  if (manifest) return 'unknown';
  return kenjitsuError ? 'down' : 'unknown';
}

function filterExtensions<T extends { enabled: boolean; nsfw: boolean; status: AdminHealthState; manifest?: { source?: string; capabilities?: string[] } | null }>(extensions: T[], params: URLSearchParams) {
  const enabled = params.get('enabled');
  const nsfw = params.get('nsfw');
  const requestedStatus = params.get('status');
  const source = params.get('source');
  const capability = params.get('capability');
  return extensions.filter((extension) => {
    if (enabled === 'yes' && !extension.enabled) return false;
    if (enabled === 'no' && extension.enabled) return false;
    if (nsfw === 'yes' && !extension.nsfw) return false;
    if (nsfw === 'no' && extension.nsfw) return false;
    if (requestedStatus && requestedStatus !== 'all' && extension.status !== requestedStatus) return false;
    if (source && extension.manifest?.source !== source) return false;
    if (capability && !extension.manifest?.capabilities?.includes(capability)) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const params = new URL(request.url).searchParams;
  const settings = await getKenjitsuExtensionSettings();
  let kenjitsuError = false;
  try {
    const health = await kenjitsuClient.getExtensionHealth();
    const byId = new Map(health.data.map((item) => [item.id, item]));
    const extensions = filterExtensions(settings.map((setting) => {
      const manifest = byId.get(setting.id);
      const status = extensionStatus(setting, manifest, false);
      return { ...setting, status, manifest: manifest || null };
    }), params);
    return NextResponse.json({ extensions, total: extensions.length });
  } catch (error) {
    kenjitsuError = true;
    const extensions = filterExtensions(settings.map((setting) => ({ ...setting, status: extensionStatus(setting, undefined, kenjitsuError), manifest: null })), params);
    console.error('[Admin Extensions Health Error]', error);
    return NextResponse.json({ extensions, total: extensions.length, kenjitsuError: 'Kenjitsu indisponível.' }, { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const body = await request.json().catch(() => null);
  if (!isExtensionId(body?.id)) return NextResponse.json({ error: 'Extensão inválida.' }, { status: 400 });
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled deve ser booleano.' }, { status: 400 });
  if (body.nsfw !== undefined && typeof body.nsfw !== 'boolean') return NextResponse.json({ error: 'nsfw deve ser booleano.' }, { status: 400 });

  const settings = await getKenjitsuExtensionSettings();
  const updated = settings.map((setting) => setting.id === body.id
    ? { ...setting, ...(body.enabled === undefined ? {} : { enabled: body.enabled }), ...(body.nsfw === undefined ? {} : { nsfw: body.nsfw }) }
    : setting);
  await saveKenjitsuExtensionSettings(updated);
  void recordAdminAudit({ actorId: auth.userId, action: 'extension.updated', resourceType: 'extension', resourceId: body.id, summary: `Extensão “${body.id}” atualizada.`, metadata: { enabled: body.enabled, nsfw: body.nsfw } });
  return NextResponse.json({ success: true, extensions: updated });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const body = await request.json().catch(() => null);
  if (!isExtensionId(body?.id)) return NextResponse.json({ error: 'Extensão inválida.' }, { status: 400 });

  const startedAt = Date.now();
  let status: 'healthy' | 'degraded' | 'down' = 'down';
  let errorMessage: string | null = null;
  let searchResultCount = 0;
  let episodeCount = 0;
  let sourceCount = 0;
  try {
    const result = await kenjitsuClient.searchExtension(body.id, 'Naruto', 1);
    searchResultCount = result.data?.length || 0;
    const metadata = await kenjitsuClient.getMetadata(20);
    const resolved = await resolveKenjitsuExtensionInfo(20, body.id, ['Naruto'], metadata.data);
    if (!resolved) {
      status = 'degraded';
      errorMessage = 'A busca não retornou uma correspondência exata para Naruto.';
    } else {
      const info = resolved.info;
      const episodes = info.providerEpisodes || info.data?.providerEpisodes || [];
      episodeCount = episodes.length;
      const episode = episodes.find((item) => item.episodeId);
      if (!episode?.episodeId) {
        status = 'degraded';
        errorMessage = 'A extensão não retornou episódios.';
      } else {
        const sources = await kenjitsuClient.getExtensionSources(body.id, episode.episodeId, 'sub');
        sourceCount = sources.data?.sources?.length || 0;
        status = sourceCount > 0 ? 'healthy' : 'degraded';
        if (!sourceCount) errorMessage = 'A extensão não retornou sources válidos.';
      }
    }
  } catch (error) {
    console.error('[Admin Extension Test Error]', { extensionId: body.id, error });
    errorMessage = 'Falha ao consultar a extensão.';
    if (error instanceof KenjitsuRequestError && error.status < 500) status = 'degraded';
  }

  const latencyMs = Date.now() - startedAt;
  await prisma.providerHealthLog.create({ data: { provider: body.id, status, latencyMs, error: errorMessage } }).catch(() => undefined);
  const settings = await getKenjitsuExtensionSettings();
  const updated = normalizeKenjitsuExtensionSettings(settings.map((setting) => setting.id === body.id
    ? { ...setting, lastTestedAt: new Date().toISOString(), lastTestStatus: status, lastLatencyMs: latencyMs, lastError: errorMessage }
    : setting));
  await saveKenjitsuExtensionSettings(updated);
  void recordAdminAudit({ actorId: auth.userId, action: 'extension.tested', resourceType: 'extension', resourceId: body.id, summary: `Teste da extensão “${body.id}”: ${status}.`, metadata: { status, latencyMs, error: errorMessage } });
  return NextResponse.json({ success: status !== 'down', status, latencyMs, error: errorMessage, searchResultCount, episodeCount, sourceCount });
}
