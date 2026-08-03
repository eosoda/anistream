import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { CreateAnimeSchema } from '@/schemas/anime';
import { prisma } from '@/lib/db/prisma';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';
import type { Prisma } from '@prisma/client';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10) || 20));
  const status = searchParams.get('status');
  const hasEpisodes = searchParams.get('hasEpisodes');
  const sort = searchParams.get('sort') || 'updatedAt';
  const skip = (page - 1) * pageSize;

  try {
    const whereClause: Prisma.AnimeWhereInput = {};
    if (q) {
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { normalizedTitle: { contains: normalizeAnimeTitle(q), mode: 'insensitive' } },
        { originalTitle: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) whereClause.status = status;
    if (hasEpisodes === 'yes') whereClause.episodes = { some: {} };
    if (hasEpisodes === 'no') whereClause.episodes = { none: {} };

    const orderBy: Prisma.AnimeOrderByWithRelationInput = sort === 'title'
      ? { title: 'asc' }
      : sort === 'episodeCount'
        ? { episodes: { _count: 'desc' } }
        : { updatedAt: 'desc' };

    const [animes, total] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: { episodes: true },
          },
          identifiers: {
            select: { provider: true, value: true },
          },
        },
      }),
      prisma.anime.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      animes,
      pagination: {
        total,
        page,
        limit: pageSize,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao listar animes', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const parseResult = CreateAnimeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados do anime inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const normalizedTitle = normalizeAnimeTitle(data.title);
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    // Verificar se o slug já existe
    const existing = await prisma.anime.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: `Já existe um anime cadastrado com o slug "${slug}"` },
        { status: 409 }
      );
    }

    const newAnime = await prisma.anime.create({
      data: {
        title: data.title,
        originalTitle: data.originalTitle,
        normalizedTitle,
        slug,
        description: data.description,
        posterUrl: data.posterUrl,
        backdropUrl: data.bannerUrl,
        releaseYear: data.releaseYear,
        status: data.status,
      },
    });

    void recordAdminAudit({
      actorId: auth.userId,
      action: 'anime.created',
      resourceType: 'anime',
      resourceId: newAnime.id,
      summary: `Anime “${newAnime.title}” cadastrado.`,
      metadata: { title: newAnime.title, slug: newAnime.slug },
    });

    return NextResponse.json({ anime: newAnime }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao cadastrar anime', message: err.message },
      { status: 500 }
    );
  }
}
