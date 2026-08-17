import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { enqueueWarmTask, selectWarmEpisodeIds } from '@/lib/streams/cache-warm';

const allowedScopes = new Set(['home', 'catalog', 'episodes']);

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json().catch(() => ({}));
    const scope = typeof body.scope === 'string' && allowedScopes.has(body.scope) ? body.scope : 'home';
    const requestedIds = Array.isArray(body.episodeIds)
      ? body.episodeIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    const episodeIds = await selectWarmEpisodeIds(scope, requestedIds);
    if (episodeIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum episódio elegível para aquecimento.' }, { status: 400 });
    }

    const audioMode = body.audioMode === 'dub' ? 'dub' : 'sub';
    const task = await prisma.playbackCacheWarmTask.create({
      data: {
        scope,
        total: episodeIds.length,
        optionsJson: JSON.stringify({ episodeIds, audioMode }),
      },
    });
    await enqueueWarmTask(task.id);
    return NextResponse.json({ success: true, task: { id: task.id, scope, status: task.status, total: task.total } }, { status: 202 });
  } catch (error) {
    console.error('[Admin Playback Cache Warm Error]', error);
    return NextResponse.json({ error: 'Não foi possível criar a tarefa de aquecimento.' }, { status: 500 });
  }
}
