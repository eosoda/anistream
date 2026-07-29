import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { M3uImportInputSchema } from '@/schemas/m3u';
import { parseM3uContent } from '@/lib/streams/m3u-parser';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { prisma } from '@/lib/db/prisma';
import { encryptData } from '@/lib/security/crypto';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const parseResult = M3uImportInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Entrada M3U inválida', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      content,
      defaultProviderName,
      defaultAudioLanguage,
      defaultQuality,
      requiresProxy,
      priority,
    } = parseResult.data;

    // 1. Parse M3U content
    const parsedItems = parseM3uContent(content);

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item válido encontrado no arquivo M3U enviado.' },
        { status: 400 }
      );
    }

    const importedResults = [];
    const skippedItems = [];

    // 2. Process each item transactionally
    for (const item of parsedItems) {
      // Validate SSRF for each media stream URL
      const ssrf = await validateUrlSsrf(item.streamUrl);
      if (!ssrf.valid) {
        skippedItems.push({
          title: item.rawTitle,
          url: item.streamUrl,
          reason: ssrf.reason,
        });
        continue;
      }

      // Find or Create Anime in DB
      const animeSlug = item.normalizedTitle.replace(/\s+/g, '-');
      const anime = await prisma.anime.upsert({
        where: { slug: animeSlug },
        update: {
          posterUrl: item.logoUrl || undefined,
        },
        create: {
          title: item.rawTitle,
          normalizedTitle: item.normalizedTitle,
          slug: animeSlug,
          posterUrl: item.logoUrl,
        },
      });

      // Find or Create Episode in DB
      const episode = await prisma.episode.upsert({
        where: {
          animeId_season_number: {
            animeId: anime.id,
            season: item.detectedSeason,
            number: item.detectedEpisode,
          },
        },
        update: {},
        create: {
          animeId: anime.id,
          season: item.detectedSeason,
          number: item.detectedEpisode,
          title: `Episódio ${item.detectedEpisode}`,
        },
      });

      // Create EpisodeSource in DB
      const encryptedUrl = encryptData(item.streamUrl);
      const isMp4 = item.streamUrl.endsWith('.mp4');

      const source = await prisma.episodeSource.create({
        data: {
          episodeId: episode.id,
          provider: defaultProviderName,
          urlEncrypted: encryptedUrl,
          type: isMp4 ? 'mp4' : 'hls',
          quality: defaultQuality,
          audioLanguage: defaultAudioLanguage,
          requiresProxy,
          priority,
          enabled: true,
        },
      });

      importedResults.push({
        animeTitle: anime.title,
        season: episode.season,
        episode: episode.number,
        sourceId: source.id,
      });
    }

    return NextResponse.json({
      summary: {
        totalParsed: parsedItems.length,
        importedCount: importedResults.length,
        skippedCount: skippedItems.length,
      },
      importedResults,
      skippedItems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao importar arquivo M3U', message: err.message },
      { status: 500 }
    );
  }
}
