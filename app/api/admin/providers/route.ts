import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import {
  getKenjitsuExtensionSettings,
  saveKenjitsuExtensionSettings,
  type KenjitsuExtensionSetting,
} from '@/lib/kenjitsu/settings';
import { KENJITSU_EXTENSION_IDS, type KenjitsuExtensionId } from '@/lib/kenjitsu/types';

async function providerSnapshot() {
  const [settings, health] = await Promise.all([
    getKenjitsuExtensionSettings(),
    kenjitsuClient.getExtensionHealth().catch(() => ({ data: [] })),
  ]);
  const healthById = new Map((health.data || []).map((item) => [item.id, item]));
  return settings.map((setting) => {
    const manifest = healthById.get(setting.id);
    return {
      id: setting.id,
      name: manifest?.name || setting.id,
      type: 'KENJITSU_EXTENSION',
      url: `${env.KENJITSU_BASE_URL}/api/extensions/${setting.id}`,
      priority: KENJITSU_EXTENSION_IDS.length - KENJITSU_EXTENSION_IDS.indexOf(setting.id),
      enabled: setting.enabled,
      nsfw: setting.nsfw,
      autoIndex: false,
      version: manifest?.version || 'unknown',
      capabilities: manifest?.capabilities || ['search', 'info', 'sources'],
      source: manifest?.source || 'self-hosted',
      lastTestedAt: setting.lastTestedAt || null,
      lastStatus: setting.lastTestStatus || null,
      lastLatencyMs: setting.lastLatencyMs || null,
      lastError: setting.lastError || null,
    };
  });
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const providers = await providerSnapshot();
    return NextResponse.json({ providers, defaultProviderId: providers.find((provider) => provider.enabled)?.id || null, source: 'kenjitsu' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  return NextResponse.json({ error: 'Fontes customizadas foram desativadas; use as extensoes do Kenjitsu.' }, { status: 410 });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const id = String(body.id || '') as KenjitsuExtensionId;
    if (!KENJITSU_EXTENSION_IDS.includes(id)) return NextResponse.json({ error: 'Extensao Kenjitsu invalida.' }, { status: 400 });

    const settings = await getKenjitsuExtensionSettings();
    const updated = settings.map((setting): KenjitsuExtensionSetting =>
      setting.id === id
        ? {
            ...setting,
            ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
            ...(typeof body.nsfw === 'boolean' ? { nsfw: body.nsfw } : {}),
          }
        : setting,
    );
    await saveKenjitsuExtensionSettings(updated);
    const providers = await providerSnapshot();
    return NextResponse.json({ success: true, provider: providers.find((provider) => provider.id === id), providers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  return NextResponse.json({ error: 'Extensoes sao gerenciadas no fork self-hosted do Kenjitsu e nao podem ser removidas pelo app.' }, { status: 410 });
}
