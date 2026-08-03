import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { syncAnimeById } from '@/lib/admin/anime-operations';
import type { AdminBulkResponse } from '@/types/admin';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const body = await request.json().catch(() => null);
  const rawIds: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const action = body?.action;
  if (!ids.length || ids.length > 100) return NextResponse.json({ error: 'Selecione entre 1 e 100 animes.' }, { status: 400 });
  if (action !== 'sync' && action !== 'delete') return NextResponse.json({ error: 'Ação em lote inválida.' }, { status: 400 });

  const results: AdminBulkResponse['results'] = [];
  for (const id of ids) {
    try {
      if (action === 'sync') {
        const result = await syncAnimeById(id);
        results.push({ id, status: 'succeeded', message: `${result.syncedEpisodesCount} episódios sincronizados.` });
        void recordAdminAudit({ actorId: auth.userId, action: 'anime.synced', resourceType: 'anime', resourceId: id, summary: `Anime “${result.animeTitle}” sincronizado em lote.`, metadata: { source: 'kenjitsu', syncedEpisodesCount: result.syncedEpisodesCount } });
      } else {
        const anime = await prisma.anime.findUnique({ where: { id }, select: { title: true } });
        if (!anime) {
          results.push({ id, status: 'skipped', message: 'Anime não encontrado.' });
          continue;
        }
        await prisma.anime.delete({ where: { id } });
        results.push({ id, status: 'succeeded', message: 'Anime excluído.' });
        void recordAdminAudit({ actorId: auth.userId, action: 'anime.deleted', resourceType: 'anime', resourceId: id, summary: `Anime “${anime.title}” excluído em lote.`, metadata: { bulk: true } });
      }
    } catch (error) {
      results.push({ id, status: 'failed', message: error instanceof Error ? error.message : 'Falha ao concluir a ação.' });
    }
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
  return NextResponse.json(response, { status: response.summary.failed ? 207 : 200 });
}
