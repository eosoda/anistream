import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { CreateAnimeSchema } from '@/schemas/anime';
import { prisma } from '@/lib/db/prisma';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  try {
    const whereClause = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { normalizedTitle: { contains: normalizeAnimeTitle(q), mode: 'insensitive' as const } },
            { originalTitle: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [animes, total] = await Promise.all([
      prisma.anime.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { episodes: true },
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
        limit,
        totalPages: Math.ceil(total / limit),
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
        bannerUrl: data.bannerUrl,
        releaseYear: data.releaseYear,
        status: data.status,
      },
    });

    return NextResponse.json({ anime: newAnime }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao cadastrar anime', message: err.message },
      { status: 500 }
    );
  }
}
