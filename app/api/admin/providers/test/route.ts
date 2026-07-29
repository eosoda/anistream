import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, url } = body;

    let targetUrl = url;
    let providerId = id;

    if (id && !url) {
      const p = await prisma.mediaProvider.findUnique({ where: { id } });
      if (p) targetUrl = p.url;
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL para teste é obrigatória.' }, { status: 400 });
    }

    const startTime = Date.now();
    let status = 0;
    let ok = false;
    let errorMsg: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Se for uma API ou Embed externo, testar via GET com User-Agent e Accept adequado
      const res = await fetch(targetUrl, {
        method: targetUrl.includes('api') || targetUrl.includes('koyeb') ? 'GET' : 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'AniStream-ProviderTester/1.0',
          Accept: 'application/json, text/html, */*',
        },
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      status = res.status;
      ok = res.ok || res.status === 200 || res.status === 206 || res.status === 302 || res.status === 301;
    } catch (err: any) {
      ok = false;
      status = 504;
      errorMsg = err.message || 'Timeout de conexão excedido (6s)';
    }

    const latencyMs = Date.now() - startTime;

    if (providerId) {
      await prisma.mediaProvider.update({
        where: { id: providerId },
        data: {
          lastTestedAt: new Date(),
          lastStatus: status,
          lastLatencyMs: latencyMs,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ok,
      status,
      latencyMs,
      error: errorMsg,
      testedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
