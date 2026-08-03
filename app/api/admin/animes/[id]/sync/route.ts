import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { syncAnimeById } from '@/lib/admin/anime-operations';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await context.params;
  try {
    const result = await syncAnimeById(animeId);
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'anime.synced',
      resourceType: 'anime',
      resourceId: animeId,
      summary: `Anime “${result.animeTitle}” sincronizado pelo Kenjitsu.`,
      metadata: { syncedEpisodesCount: result.syncedEpisodesCount, source: 'kenjitsu' },
    });

    return NextResponse.json({
      success: true,
      message: `Sincronização de "${result.animeTitle}" concluída pelo Kenjitsu: ${result.syncedEpisodesCount} episódios.`,
      animeTitle: result.animeTitle,
      syncedEpisodesCount: result.syncedEpisodesCount,
      sourceResolution: 'live-kenjitsu',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao sincronizar pelo Kenjitsu', details: error.message }, { status: 502 });
  }
}
