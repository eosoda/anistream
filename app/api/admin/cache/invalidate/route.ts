import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { bumpPlaybackCacheVersion } from '@/lib/streams/playback-cache';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const version = await bumpPlaybackCacheVersion();
    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('[Admin Playback Cache Invalidate Error]', error);
    return NextResponse.json({ error: 'Não foi possível invalidar o cache.' }, { status: 500 });
  }
}
