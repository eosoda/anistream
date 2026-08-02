import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { defaultStreamResolver } from '@/lib/streams/resolver';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { animeTitle, episodeNumber } = body;
    if (!animeTitle || !episodeNumber) {
      return NextResponse.json({ error: 'Titulo do anime e numero do episodio sao obrigatorios.' }, { status: 400 });
    }

    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { normalizedTitle: { contains: String(animeTitle).toLowerCase() } },
          { title: { contains: String(animeTitle), mode: 'insensitive' } },
        ],
      },
      include: { aliases: true },
    });
    if (!anime) return NextResponse.json({ error: 'Anime nao encontrado no catalogo local.' }, { status: 404 });

    const resolution = await defaultStreamResolver.resolveEpisodeStream({
      animeId: anime.id,
      season: 1,
      episode: Number(episodeNumber),
      animeTitle: anime.title,
      originalTitle: anime.originalTitle || undefined,
      aliases: [anime.title, anime.originalTitle || '', ...anime.aliases.map((alias: { value: string }) => alias.value)].filter(Boolean),
      resolutionMode: 'complete',
    });

    if (!resolution.selected) {
      return NextResponse.json({ error: 'Nenhuma fonte live disponivel no Kenjitsu.', attempts: resolution.attempts }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Fonte live encontrada para ${anime.title} - Episodio ${episodeNumber}.`,
      source: resolution.selected,
      alternatives: resolution.alternatives,
      attempts: resolution.attempts,
      persisted: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao resolver fonte pelo Kenjitsu', details: error.message }, { status: 502 });
  }
}
