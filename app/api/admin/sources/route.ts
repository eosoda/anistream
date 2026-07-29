import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { CreateEpisodeSourceSchema } from '@/schemas/source';
import { prisma } from '@/lib/db/prisma';
import { encryptData } from '@/lib/security/crypto';
import { validateUrlSsrf } from '@/lib/security/ssrf';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get('episodeId');

  try {
    const sources = await prisma.episodeSource.findMany({
      where: episodeId ? { episodeId } : undefined,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { episode: { select: { title: true, number: true, season: true } } },
    });

    const safeSources = sources.map((s: any) => ({
      ...s,
      trafficBytes: Number(s.trafficBytes || 0),
    }));

    return NextResponse.json({ sources: safeSources });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao buscar fontes', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const parseResult = CreateEpisodeSourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // 1. SSRF & Host Validation
    const ssrfCheck = await validateUrlSsrf(input.url);
    if (!ssrfCheck.valid) {
      return NextResponse.json(
        { error: `URL não permitida para cadastro: ${ssrfCheck.reason}` },
        { status: 403 }
      );
    }

    // 2. Encrypt sensitive fields
    const encryptedUrl = encryptData(input.url);
    const encryptedHeaders = input.headers
      ? encryptData(JSON.stringify(input.headers))
      : null;

    // 3. Create EpisodeSource in DB
    const newSource = await prisma.episodeSource.create({
      data: {
        episodeId: input.episodeId,
        provider: input.provider,
        urlEncrypted: encryptedUrl,
        type: input.type,
        quality: input.quality,
        width: input.width,
        height: input.height,
        bitrate: input.bitrate,
        audioLanguage: input.audioLanguage,
        requiresProxy: input.requiresProxy,
        headersEncrypted: encryptedHeaders,
        priority: input.priority,
        enabled: input.enabled,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    const safeSource = {
      ...newSource,
      trafficBytes: Number(newSource.trafficBytes || 0),
    };

    return NextResponse.json({ source: safeSource }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao criar fonte de vídeo', message: err.message },
      { status: 500 }
    );
  }
}
