import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getKenjitsuExtensionSettings, saveKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';
import { KENJITSU_EXTENSION_IDS } from '@/lib/kenjitsu/types';
import { recordAdminAudit } from '@/lib/admin/audit';
import type { AdminBulkResponse } from '@/types/admin';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const body = await request.json().catch(() => null);
  const rawIds: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids = [...new Set(rawIds.filter((id): id is string => typeof id === 'string'))];
  const action = body?.action;
  if (!ids.length || ids.length > 100) return NextResponse.json({ error: 'Selecione entre 1 e 100 extensões.' }, { status: 400 });
  if (action !== 'enable' && action !== 'disable') return NextResponse.json({ error: 'Ação em lote inválida.' }, { status: 400 });

  const knownIds = new Set<string>(KENJITSU_EXTENSION_IDS);
  const results: AdminBulkResponse['results'] = [];
  const settings = await getKenjitsuExtensionSettings();
  const updated = settings.map((setting) => {
    if (!ids.includes(setting.id)) return setting;
    if (!knownIds.has(setting.id)) {
      results.push({ id: setting.id, status: 'skipped', message: 'Extensão desconhecida.' });
      return setting;
    }
    results.push({ id: setting.id, status: 'succeeded', message: action === 'enable' ? 'Extensão ativada.' : 'Extensão desativada.' });
    return { ...setting, enabled: action === 'enable' };
  });
  const handledIds = new Set<string>(settings.map((setting) => setting.id));
  ids.filter((id) => !handledIds.has(id)).forEach((id) => results.push({ id, status: 'skipped', message: 'Extensão desconhecida.' }));

  await saveKenjitsuExtensionSettings(updated);
  for (const result of results.filter((item) => item.status === 'succeeded')) {
    void recordAdminAudit({ actorId: auth.userId, action: 'extension.updated', resourceType: 'extension', resourceId: result.id, summary: `Extensão “${result.id}” ${action === 'enable' ? 'ativada' : 'desativada'} em lote.`, metadata: { bulk: true, action } });
  }

  const response: AdminBulkResponse = {
    results,
    summary: {
      requested: ids.length,
      succeeded: results.filter((item) => item.status === 'succeeded').length,
      failed: results.filter((item) => item.status === 'failed').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
    },
  };
  return NextResponse.json({ ...response, extensions: updated });
}
