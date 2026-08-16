import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { defaultStreamResolver } from '@/lib/streams/resolver';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id: animeId, epId } = await context.params;

  try {
    const episode = await prisma.episode.findUnique({
      where: { id: epId },
      include: {
        anime: {
          include: {
            identifiers: true,
            aliases: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
    }

    const aliases = Array.from(
      new Set([
        episode.anime.title,
        episode.anime.originalTitle || '',
        ...episode.anime.aliases.map((a: any) => a.value),
      ])
    ).filter(Boolean);

    // Disparar busca de mídias em tempo real através das extensões Kenjitsu habilitadas
    const result = await defaultStreamResolver.resolveEpisodeStream({
      animeId: episode.animeId,
      season: episode.season || 1,
      episode: episode.number || 1,
      animeTitle: episode.anime.title,
      originalTitle: episode.anime.originalTitle || undefined,
      aliases,
    });

    const candidates: Array<{
      provider: string;
      url: string;
      type: string;
      quality: string;
      audioLanguage: string;
    }> = [];

    if (result.selected) {
      candidates.push({
        provider: result.selected.provider,
        url: result.selected.url,
        type: result.selected.type,
        quality: result.selected.quality || 'Auto',
        audioLanguage: result.selected.audioLanguage || 'ja',
      });
    }

    for (const alt of result.alternatives) {
      if (!candidates.some((c) => c.url === alt.url)) {
        candidates.push({
          provider: alt.provider,
          url: alt.url,
          type: alt.type,
          quality: alt.quality || 'Auto',
          audioLanguage: alt.audioLanguage || 'ja',
        });
      }
    }

    return NextResponse.json({
      success: true,
      candidates,
      attempts: result.attempts,
    });
  } catch (error) {
    console.error('[Admin Discover Sources Error]', error);
    return NextResponse.json(
      { error: 'Não foi possível consultar mídias nas extensões Kenjitsu.' },
      { status: 500 }
    );
  }
}
