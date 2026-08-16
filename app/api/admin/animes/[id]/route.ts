import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { UpdateAnimeSchema } from '@/schemas/anime';
import { prisma } from '@/lib/db/prisma';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id } = await params;

  try {
    const anime = await prisma.anime.findUnique({
      where: { id },
      include: {
        aliases: true,
        identifiers: true,
        episodes: {
          orderBy: [{ season: 'asc' }, { number: 'asc' }],
          include: {
            sources: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!anime) {
      return NextResponse.json({ error: 'Anime não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ anime });
  } catch (error) {
    console.error('[Admin Anime Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar o anime.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = UpdateAnimeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Dados inválidos para atualização', details: parseResult.error.flatten() }, { status: 400 });
    }

    const data = parseResult.data;
    const normalizedTitle = data.title ? normalizeAnimeTitle(data.title) : undefined;

    const updatedAnime = await prisma.anime.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title, normalizedTitle } : {}),
        ...(data.originalTitle !== undefined ? { originalTitle: data.originalTitle } : {}),
        ...(data.slug ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.posterUrl !== undefined ? { posterUrl: data.posterUrl } : {}),
        ...(data.bannerUrl !== undefined ? { backdropUrl: data.bannerUrl } : {}),
        ...(data.releaseYear !== undefined ? { releaseYear: data.releaseYear } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.openingStartSeconds !== undefined ? { openingStartSeconds: data.openingStartSeconds } : {}),
        ...(data.openingEndSeconds !== undefined ? { openingEndSeconds: data.openingEndSeconds } : {}),
      },
    });

    void recordAdminAudit({ actorId: auth.userId, action: 'anime.updated', resourceType: 'anime', resourceId: id, summary: `Anime “${updatedAnime.title}” atualizado.`, metadata: { fields: Object.keys(data) } });

    return NextResponse.json({ anime: updatedAnime });
  } catch (error) {
    console.error('[Admin Anime Update Error]', error);
    return NextResponse.json({ error: 'Não foi possível atualizar o anime.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { id } = await params;

  try {
    const anime = await prisma.anime.delete({
      where: { id },
    });

    void recordAdminAudit({ actorId: auth.userId, action: 'anime.deleted', resourceType: 'anime', resourceId: id, summary: `Anime “${anime.title}” excluído.`, metadata: { cascadeEpisodes: true } });

    return NextResponse.json({ success: true, message: 'Anime excluído com sucesso' });
  } catch (error) {
    console.error('[Admin Anime Delete Error]', error);
    return NextResponse.json({ error: 'Não foi possível excluir o anime.' }, { status: 500 });
  }
}
