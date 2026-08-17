import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getPlaybackCacheMetrics } from '@/lib/streams/cache-warm';
import { getPlaybackCacheSettings, savePlaybackCacheSettings } from '@/lib/streams/playback-cache';
import { redisPing } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const [settings, redisHealthy, metrics] = await Promise.all([
      getPlaybackCacheSettings(),
      redisPing(),
      getPlaybackCacheMetrics(),
    ]);
    return NextResponse.json({ success: true, settings, redis: { healthy: redisHealthy }, metrics });
  } catch (error) {
    console.error('[Admin Playback Cache GET Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar o estado do cache.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const settings = await savePlaybackCacheSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[Admin Playback Cache PUT Error]', error);
    return NextResponse.json({ error: 'Não foi possível salvar as configurações do cache.' }, { status: 400 });
  }
}
