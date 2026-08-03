import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { OpeningIntervalSchema } from '@/schemas/episode';
import { recordAdminAudit } from '@/lib/admin/audit';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await context.params;
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    include: { episodes: { orderBy: [{ season: 'asc' }, { number: 'asc' }] } },
  });
  if (!anime) return NextResponse.json({ error: 'Anime nao encontrado.' }, { status: 404 });

  const body = await request.json();
  if (body.action === 'preview') {
    return NextResponse.json({
      source: 'kenjitsu',
      results: [],
      foundCount: 0,
      missingCount: anime.episodes.length,
      message: 'O Kenjitsu nao expoe intervalos de abertura automaticamente; informe os intervalos manualmente.',
    });
  }

  if (body.action !== 'save' || !Array.isArray(body.episodes)) {
    return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 });
  }

  const episodesById = new Map(anime.episodes.map((episode: any) => [episode.id, episode]));
  const updates: Array<{ episodeId: string; openingStartSeconds: number; openingEndSeconds: number }> = [];
  for (const item of body.episodes) {
    const episode = episodesById.get(item.episodeId) as any;
    if (!episode) return NextResponse.json({ error: 'A selecao contem um episodio invalido.' }, { status: 400 });
    const parsed = OpeningIntervalSchema.safeParse({
      openingStartSeconds: item.openingStartSeconds,
      openingEndSeconds: item.openingEndSeconds,
      durationSeconds: episode.durationSeconds,
    });
    if (!parsed.success || parsed.data.openingStartSeconds == null || parsed.data.openingEndSeconds == null) {
      return NextResponse.json({ error: `Intervalo invalido no episodio ${episode.number}.` }, { status: 400 });
    }
    updates.push({ episodeId: episode.id, openingStartSeconds: parsed.data.openingStartSeconds, openingEndSeconds: parsed.data.openingEndSeconds });
  }

  await prisma.$transaction(updates.map((item) => prisma.episode.update({
    where: { id: item.episodeId },
    data: { openingStartSeconds: item.openingStartSeconds, openingEndSeconds: item.openingEndSeconds },
  })));
  void recordAdminAudit({ actorId: auth.userId, action: 'anime.openings_imported', resourceType: 'anime', resourceId: animeId, summary: `${updates.length} abertura(s) revisada(s) no catálogo.`, metadata: { updatedCount: updates.length, source: 'aniskip-review' } });
  return NextResponse.json({ success: true, updatedCount: updates.length });
}
