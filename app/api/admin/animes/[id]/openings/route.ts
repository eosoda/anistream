import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { OpeningIntervalSchema } from '@/schemas/episode';

type RouteContext = { params: Promise<{ id: string }> };

type AniSkipResult = {
  found?: boolean;
  results?: Array<{
    interval?: { startTime?: number; endTime?: number };
    skipType?: string;
  }>;
};

async function fetchAniSkipOpening(malId: string, episode: { id: string; number: number; durationSeconds: number | null }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const params = new URLSearchParams({ types: 'op' });
    const durationSeconds = episode.durationSeconds ? (episode.durationSeconds < 300 ? episode.durationSeconds * 60 : episode.durationSeconds) : 1440;
    params.set('episodeLength', String(durationSeconds));
    const response = await fetch(`https://api.aniskip.com/v2/skip-times/${encodeURIComponent(malId)}/${episode.number}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'AniStream-Admin/2.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (response.status === 404) {
      return { episodeId: episode.id, episodeNumber: episode.number, found: false as const };
    }
    if (!response.ok) throw new Error(`AniSkip respondeu HTTP ${response.status}`);

    const payload = (await response.json()) as AniSkipResult;
    const opening = payload.results?.find((result) => result.skipType === 'op' && Number.isFinite(result.interval?.startTime) && Number.isFinite(result.interval?.endTime));
    if (!opening?.interval) {
      return { episodeId: episode.id, episodeNumber: episode.number, found: false as const };
    }

    return {
      episodeId: episode.id,
      episodeNumber: episode.number,
      found: true as const,
      openingStartSeconds: Number(opening.interval.startTime),
      openingEndSeconds: Number(opening.interval.endTime),
    };
  } catch (error) {
    return {
      episodeId: episode.id,
      episodeNumber: episode.number,
      found: false as const,
      error: error instanceof Error && error.name === 'AbortError' ? 'Tempo limite excedido' : error instanceof Error ? error.message : 'Falha desconhecida',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId } = await context.params;
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    include: {
      identifiers: true,
      episodes: { orderBy: [{ season: 'asc' }, { number: 'asc' }] },
    },
  });
  if (!anime) return NextResponse.json({ error: 'Anime não encontrado.' }, { status: 404 });

  const body = await request.json();
  if (body.action === 'preview') {
    const malIdentifier = anime.identifiers.find((identifier: { provider: string }) => ['jikan', 'mal', 'myanimelist'].includes(identifier.provider.toLowerCase()));
    if (!malIdentifier) {
      return NextResponse.json({ error: 'Este anime não possui identificador MAL/Jikan para consultar a AniSkip.' }, { status: 422 });
    }

    const results: Awaited<ReturnType<typeof fetchAniSkipOpening>>[] = [];
    for (let index = 0; index < anime.episodes.length; index += 5) {
      const batch = anime.episodes.slice(index, index + 5);
      results.push(...(await Promise.all(batch.map((episode: any) => fetchAniSkipOpening(malIdentifier.value, episode)))));
    }
    return NextResponse.json({
      malId: malIdentifier.value,
      results,
      foundCount: results.filter((result) => result.found).length,
      missingCount: results.filter((result) => !result.found).length,
    });
  }

  if (body.action === 'save' && Array.isArray(body.episodes)) {
    const episodesById = new Map(anime.episodes.map((episode: any) => [episode.id, episode]));
    const updates: Array<{ episodeId: string; openingStartSeconds: number; openingEndSeconds: number }> = [];

    for (const item of body.episodes) {
      const episode = episodesById.get(item.episodeId) as any;
      if (!episode) {
        return NextResponse.json({ error: 'A seleção contém um episódio inválido.' }, { status: 400 });
      }
      const parsed = OpeningIntervalSchema.safeParse({
        openingStartSeconds: item.openingStartSeconds,
        openingEndSeconds: item.openingEndSeconds,
        durationSeconds: episode.durationSeconds && episode.durationSeconds < 300 ? episode.durationSeconds * 60 : episode.durationSeconds,
      });
      if (!parsed.success || parsed.data.openingStartSeconds == null || parsed.data.openingEndSeconds == null) {
        return NextResponse.json({ error: `Intervalo inválido no episódio ${episode.number}.`, details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
      }
      updates.push({
        episodeId: episode.id,
        openingStartSeconds: parsed.data.openingStartSeconds,
        openingEndSeconds: parsed.data.openingEndSeconds,
      });
    }

    await prisma.$transaction(
      updates.map((item) =>
        prisma.episode.update({
          where: { id: item.episodeId },
          data: {
            openingStartSeconds: item.openingStartSeconds,
            openingEndSeconds: item.openingEndSeconds,
          },
        })
      )
    );
    return NextResponse.json({ success: true, updatedCount: updates.length });
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
