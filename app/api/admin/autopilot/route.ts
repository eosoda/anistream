import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseM3uContent } from '@/lib/streams/m3u-parser';

// GET: Status do robô e fila de revisão manual
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'auto_indexer_enabled' },
    });

    const isEnabled = setting ? Boolean(JSON.parse(setting.value).enabled) : false;

    const queue = await prisma.autoIndexerQueue.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      autoIndexerEnabled: isEnabled,
      pendingCount: queue.length,
      queue,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Alternar Modo Automático ON/OFF ou Executar Varredura
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, enabled } = body;

    // Alternar chave de ativar/desativar robô automático
    if (action === 'toggle') {
      const valStr = JSON.stringify({ enabled: Boolean(enabled), updatedAt: new Date().toISOString() });
      await prisma.systemSetting.upsert({
        where: { key: 'auto_indexer_enabled' },
        update: { value: valStr },
        create: { key: 'auto_indexer_enabled', value: valStr },
      });

      return NextResponse.json({
        success: true,
        autoIndexerEnabled: Boolean(enabled),
        message: `Modo Automático ${enabled ? 'ATIVADO (Criação direta no banco)' : 'DESATIVADO (Modo Fila de Revisão Manual)'}.`,
      });
    }

    // Executar Varredura dos Provedores Ativos
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'auto_indexer_enabled' },
    });
    const isAutoMode = setting ? Boolean(JSON.parse(setting.value).enabled) : false;

    // Buscar provedores ativos
    const activeProviders = await prisma.mediaProvider.findMany({
      where: { enabled: true, autoIndex: true },
    });

    let totalDiscovered = 0;
    let autoCreated = 0;
    let addedToQueue = 0;

    for (const provider of activeProviders) {
      if (provider.type === 'M3U' && provider.url) {
        try {
          const res = await fetch(provider.url, {
            headers: { 'User-Agent': 'AniStream-Autopilot/1.0' },
          });
          if (res.ok) {
            const m3uText = await res.text();
            const items = parseM3uContent(m3uText);

            // Agrupar por animes únicos
            const uniqueTitles = Array.from(new Set(items.map((i) => i.rawTitle)));

            for (const cleanTitle of uniqueTitles.slice(0, 5)) {
              totalDiscovered++;

              if (isAutoMode) {
                // MODO AUTOMÁTICO: Respeitar pacing de 1000ms para Jikan API
                await new Promise((res) => setTimeout(res, 1000));

                try {
                  let jikanRes = await fetch(
                    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`
                  );

                  if (jikanRes.status === 429) {
                    await new Promise((res) => setTimeout(res, 2000));
                    jikanRes = await fetch(
                      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`
                    );
                  }
                  if (jikanRes.ok) {
                    const jikanData = await jikanRes.json();
                    const animeInfo = jikanData?.data?.[0];

                    if (animeInfo) {
                      const title = animeInfo.title_english || animeInfo.title || cleanTitle;
                      const slug =
                        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
                        `anime-${animeInfo.mal_id}`;

                      const posterUrl =
                        animeInfo.images?.jpg?.large_image_url ||
                        animeInfo.images?.jpg?.image_url ||
                        'https://picsum.photos/300/450';

                      const anime = await prisma.anime.upsert({
                        where: { slug },
                        update: {
                          title,
                          normalizedTitle: title.toLowerCase(),
                          synopsis: animeInfo.synopsis || 'Sem sinopse.',
                          posterUrl,
                          rating: animeInfo.score || 8.0,
                          year: animeInfo.year || new Date().getFullYear(),
                        },
                        create: {
                          title,
                          normalizedTitle: title.toLowerCase(),
                          slug,
                          synopsis: animeInfo.synopsis || 'Sem sinopse.',
                          posterUrl,
                          rating: animeInfo.score || 8.0,
                          year: animeInfo.year || new Date().getFullYear(),
                        },
                      });

                      await prisma.episode.upsert({
                        where: {
                          animeId_season_number: { animeId: anime.id, season: 1, number: 1 },
                        },
                        update: {},
                        create: {
                          animeId: anime.id,
                          season: 1,
                          number: 1,
                          title: 'Episódio 1',
                        },
                      });

                      autoCreated++;
                    }
                  }
                } catch (e) {
                  // Fallback se Jikan limitar
                }
              } else {
                // MODO MANUAL: Adicionar à fila de revisão do admin
                await prisma.autoIndexerQueue.create({
                  data: {
                    providerId: provider.id,
                    animeTitle: cleanTitle,
                    detectedEpisode: 1,
                    status: 'PENDING',
                  },
                });
                addedToQueue++;
              }
            }
          }
        } catch (err) {
          // Erro de leitura do provedor
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isAutoMode
        ? `Varredura concluída! ${autoCreated} animes criados automaticamente no banco.`
        : `Varredura concluída! ${addedToQueue} animes adicionados à fila de revisão manual.`,
      totalDiscovered,
      autoCreated,
      addedToQueue,
      isAutoMode,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Aprovar ou Rejeitar item da Fila de Revisão
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body; // action: 'APPROVED' | 'REJECTED'

    if (!id || !action) {
      return NextResponse.json({ error: 'ID e ação são obrigatórios.' }, { status: 400 });
    }

    if (action === 'REJECTED') {
      await prisma.autoIndexerQueue.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ success: true, message: 'Candidato rejeitado.' });
    }

    const item = await prisma.autoIndexerQueue.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });

    // Aprovar: Buscar metadados Jikan e cadastrar no PostgreSQL
    const cleanTitle = item.animeTitle;
    const jikanRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanTitle)}&limit=1`
    );
    const jikanData = await jikanRes.json();
    const animeInfo = jikanData?.data?.[0];

    const title = animeInfo?.title_english || animeInfo?.title || cleanTitle;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `anime-${Date.now()}`;
    const posterUrl = animeInfo?.images?.jpg?.large_image_url || 'https://picsum.photos/300/450';

    const anime = await prisma.anime.upsert({
      where: { slug },
      update: {
        title,
        normalizedTitle: title.toLowerCase(),
        synopsis: animeInfo?.synopsis || 'Sem sinopse.',
        posterUrl,
        rating: animeInfo?.score || 8.0,
      },
      create: {
        title,
        normalizedTitle: title.toLowerCase(),
        slug,
        synopsis: animeInfo?.synopsis || 'Sem sinopse.',
        posterUrl,
        rating: animeInfo?.score || 8.0,
      },
    });

    await prisma.episode.upsert({
      where: { animeId_season_number: { animeId: anime.id, season: 1, number: item.detectedEpisode || 1 } },
      update: {},
      create: {
        animeId: anime.id,
        season: 1,
        number: item.detectedEpisode || 1,
        title: `Episódio ${item.detectedEpisode || 1}`,
      },
    });

    await prisma.autoIndexerQueue.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    return NextResponse.json({
      success: true,
      message: `Anime "${title}" aprovado e criado com dados oficiais!`,
      anime,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
