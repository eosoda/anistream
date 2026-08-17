import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decryptData } from '@/lib/security/crypto';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { safeFetch } from '@/lib/security/safe-fetch';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

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
  } catch (error) {
    console.error('[Admin Dead Links Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar os links inativos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

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

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const ssrfResult = await validateUrlSsrf(decryptedUrl);
        if (!ssrfResult.valid) {
          console.warn('[Dead Links SSRF validation blocked]', { sourceId: source.id, reason: ssrfResult.reason });
          status = 400;
        } else {
          const res = await safeFetch(decryptedUrl, {
            method: 'HEAD',
            timeoutMs: 4000,
            headers: { 'User-Agent': 'AniStream-DeadLinkFinder/1.0' },
          });

          status = res.status;
          isOk = res.ok || res.status === 200 || res.status === 206 || res.status === 302;
        }
      } catch (error) {
        console.warn('[Dead Links Check Error]', { sourceId: source.id, error: error instanceof Error ? error.message : 'Falha desconhecida' });
        isOk = false;
        status = 504;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
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
  } catch (error) {
    console.error('[Admin Dead Links Scan Error]', error);
    return NextResponse.json({ error: 'Não foi possível executar a varredura de links.' }, { status: 500 });
  }
}
