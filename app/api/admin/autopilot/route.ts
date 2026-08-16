import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { kenjitsuClient } from '@/lib/kenjitsu/client';
import { getAnimeEpisodes } from '@/lib/kenjitsu/catalog';
import { searchAnimeMetadata } from '@/lib/anime/metadata-fetcher';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'auto_indexer_enabled' } });
    const isEnabled = setting ? Boolean(JSON.parse(setting.value).enabled) : false;
    const queue = await prisma.autoIndexerQueue.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ autoIndexerEnabled: isEnabled, pendingCount: queue.length, queue, mode: 'kenjitsu' });
  } catch (error) {
    console.error('[Admin Autopilot Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar o autopilot.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { action, enabled } = body;

    if (action === 'toggle') {
      const value = JSON.stringify({ enabled: Boolean(enabled), updatedAt: new Date().toISOString() });
      await prisma.systemSetting.upsert({
        where: { key: 'auto_indexer_enabled' },
        update: { value },
        create: { key: 'auto_indexer_enabled', value },
      });
      void recordAdminAudit({ actorId: auth.userId, action: 'autopilot.toggled', resourceType: 'autopilot', summary: `Autopilot Kenjitsu ${enabled ? 'ativado' : 'desativado'}.`, metadata: { enabled: Boolean(enabled) } });
      return NextResponse.json({
        success: true,
        autoIndexerEnabled: Boolean(enabled),
        message: `Modo de indexacao Kenjitsu ${enabled ? 'ativado' : 'desativado'}.`,
      });
    }

    const health = await kenjitsuClient.getExtensionHealth();
    void recordAdminAudit({ actorId: auth.userId, action: 'autopilot.run', resourceType: 'autopilot', summary: 'Diagnóstico do autopilot Kenjitsu executado.', metadata: { extensionCount: health.data?.length || 0 } });
    return NextResponse.json({
      success: true,
      mode: 'kenjitsu',
      message: 'A descoberta automatica agora usa somente o catalogo Kenjitsu e as extensoes habilitadas.',
      totalDiscovered: health.data?.length || 0,
      autoCreated: 0,
      addedToQueue: 0,
      extensions: health.data || [],
    });
  } catch (error) {
    console.error('[Admin Autopilot Run Error]', error);
    return NextResponse.json({ error: 'Falha na operação do autopilot Kenjitsu.' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { id, action } = body;
    if (!id || !action) return NextResponse.json({ error: 'ID e acao sao obrigatorios.' }, { status: 400 });

    if (action === 'REJECTED') {
      await prisma.autoIndexerQueue.update({ where: { id }, data: { status: 'REJECTED' } });
      void recordAdminAudit({ actorId: auth.userId, action: 'autopilot.candidate_rejected', resourceType: 'autopilot', resourceId: id, summary: 'Candidato do autopilot rejeitado.' });
      return NextResponse.json({ success: true, message: 'Candidato rejeitado.' });
    }

    const item = await prisma.autoIndexerQueue.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Item nao encontrado.' }, { status: 404 });
    const [meta] = await searchAnimeMetadata(item.animeTitle);
    if (!meta) return NextResponse.json({ error: 'Anime nao encontrado no catalogo do Kenjitsu.' }, { status: 404 });

    const slug = meta.slug || `anime-${meta.anilistId || meta.malId || Date.now()}`;
    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title: meta.title,
        normalizedTitle: meta.normalizedTitle,
        originalTitle: meta.originalTitle,
        synopsis: meta.description,
        description: meta.description,
        posterUrl: meta.posterUrl,
        backdropUrl: meta.bannerUrl,
        rating: meta.rating,
        year: meta.releaseYear,
        releaseYear: meta.releaseYear,
        status: meta.status,
        genres: meta.genres,
      },
      create: {
        title: meta.title,
        normalizedTitle: meta.normalizedTitle,
        originalTitle: meta.originalTitle,
        slug,
        synopsis: meta.description,
        description: meta.description,
        posterUrl: meta.posterUrl,
        backdropUrl: meta.bannerUrl,
        rating: meta.rating,
        year: meta.releaseYear,
        releaseYear: meta.releaseYear,
        status: meta.status,
        genres: meta.genres,
      },
    });

    const episodes = await getAnimeEpisodes(meta.anilistId || meta.malId || anime.id);
    for (const episode of episodes) {
      await prisma.episode.upsert({
        where: { animeId_season_number: { animeId: anime.id, season: 1, number: episode.mal_id } },
        update: { title: episode.title },
        create: { animeId: anime.id, season: 1, number: episode.mal_id, title: episode.title },
      });
    }

    await prisma.autoIndexerQueue.update({ where: { id }, data: { status: 'APPROVED' } });
    void recordAdminAudit({ actorId: auth.userId, action: 'autopilot.candidate_approved', resourceType: 'autopilot', resourceId: id, summary: `Candidato “${meta.title}” aprovado pelo Kenjitsu.`, metadata: { animeId: anime.id, episodesCount: episodes.length } });
    return NextResponse.json({ success: true, message: `Anime "${meta.title}" aprovado via Kenjitsu.`, anime, episodesCount: episodes.length });
  } catch (error) {
    console.error('[Admin Autopilot Approval Error]', error);
    return NextResponse.json({ error: 'Falha ao aprovar o item pelo Kenjitsu.' }, { status: 502 });
  }
}
