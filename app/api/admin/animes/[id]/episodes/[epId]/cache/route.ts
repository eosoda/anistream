import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { warmEpisodeCacheById } from '@/lib/streams/cache-warm';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> },
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { epId } = await context.params;
  try {
    const body = await request.json().catch(() => ({}));
    const state = await warmEpisodeCacheById(epId, { audioMode: body.audioMode === 'dub' ? 'dub' : 'sub' });
    if (!state) return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true, cache: state });
  } catch (error) {
    console.error('[Admin Episode Cache Error]', error);
    return NextResponse.json({ error: 'Não foi possível aquecer a mídia do episódio.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> },
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { epId } = await context.params;
  try {
    const state = await import('@/lib/db/prisma').then(({ prisma }) => prisma.episodeCacheState.update({
      where: { episodeId: epId },
      data: { status: 'invalidated', expiresAt: null, sourceCount: 0, lastError: null },
    }));
    await import('@/lib/streams/playback-cache').then(({ bumpPlaybackCacheVersion }) => bumpPlaybackCacheVersion());
    return NextResponse.json({ success: true, cache: { episodeId: state.episodeId, status: state.status, sourceCount: state.sourceCount } });
  } catch {
    return NextResponse.json({ success: true, cache: { episodeId: epId, status: 'invalidated', sourceCount: 0 } });
  }
}
