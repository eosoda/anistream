import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decryptData } from '@/lib/security/crypto';

export async function GET() {
  try {
    // Listar todas as fontes inativas ou com contador de falhas > 0
    const deadSources = await prisma.episodeSource.findMany({
      where: {
        OR: [{ enabled: false }, { failureCount: { gt: 0 } }],
      },
      include: {
        episode: {
          include: {
            anime: {
              select: { title: true, slug: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const safeDeadSources = deadSources.map((s: any) => ({
      ...s,
      trafficBytes: Number(s.trafficBytes || 0),
    }));

    return NextResponse.json({ deadSources: safeDeadSources });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Executar varredura de diagnostico em lote de ate 20 fontes ativas
    const sourcesToTest = await prisma.episodeSource.findMany({
      where: { enabled: true },
      take: 20,
      orderBy: { lastCheckedAt: 'asc' },
    });

    let checkedCount = 0;
    let failedCount = 0;

    for (const source of sourcesToTest) {
      checkedCount++;
      const decryptedUrl = source.urlEncrypted.startsWith('enc_')
        ? decryptData(source.urlEncrypted)
        : source.urlEncrypted;

      const startTime = Date.now();
      let status = 0;
      let isOk = false;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(decryptedUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'AniStream-DeadLinkFinder/1.0' },
        });

        clearTimeout(timeoutId);
        status = res.status;
        isOk = res.ok || res.status === 200 || res.status === 206 || res.status === 302;
      } catch (err) {
        isOk = false;
        status = 504;
      }

      const latencyMs = Date.now() - startTime;
      const newFailureCount = isOk ? 0 : source.failureCount + 1;
      const shouldDisable = newFailureCount >= 3;

      await prisma.episodeSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: status,
          lastLatencyMs: latencyMs,
          failureCount: newFailureCount,
          enabled: shouldDisable ? false : source.enabled,
        },
      });

      if (!isOk) {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Varredura concluída: ${checkedCount} fontes testadas. ${failedCount} fontes com falhas.`,
      checkedCount,
      failedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
