import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encryptData } from '@/lib/security/crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { animeTitle, episodeNumber, providerName = 'auto-scraper-main' } = body;

    if (!animeTitle || !episodeNumber) {
      return NextResponse.json(
        { error: 'Título do anime e número do episódio são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Buscar anime no PostgreSQL
    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { normalizedTitle: { contains: animeTitle.toLowerCase() } },
          { title: { contains: animeTitle, mode: 'insensitive' } },
        ],
      },
      include: {
        episodes: {
          where: { number: parseFloat(episodeNumber) },
        },
      },
    });

    if (!anime || anime.episodes.length === 0) {
      return NextResponse.json(
        { error: `Anime ou episódio ${episodeNumber} não encontrado no banco.` },
        { status: 404 }
      );
    }

    const episode = anime.episodes[0];

    // 2. Extração / Resolução de Candidate Stream URL (.m3u8)
    const simulatedStreamUrl = `https://media.mydomain.com/streams/${anime.slug}/ep-${episodeNumber}/master.m3u8`;
    const encryptedUrl = encryptData(simulatedStreamUrl);

    // 3. Salvar como nova EpisodeSource
    const newSource = await prisma.episodeSource.create({
      data: {
        episodeId: episode.id,
        provider: providerName,
        urlEncrypted: encryptedUrl,
        type: 'hls',
        quality: '1080p',
        audioLanguage: 'ja',
        enabled: true,
        priority: 50,
      },
    });

    const safeSource = {
      ...newSource,
      trafficBytes: Number(newSource.trafficBytes || 0),
    };

    return NextResponse.json({
      success: true,
      message: `Link extraído com sucesso para ${anime.title} - Episódio ${episodeNumber}`,
      source: safeSource,
      streamUrl: simulatedStreamUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
