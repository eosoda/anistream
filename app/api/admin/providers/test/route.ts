import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import {
  getAnimeSdkProviderKey,
  testAnimeSdkProvider,
} from '@/lib/providers/anime-sdk';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await req.json();
    const { id, url } = body;
    const provider = id
      ? await prisma.mediaProvider.findUnique({ where: { id } })
      : null;
    const targetUrl = url || provider?.url;

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL para teste é obrigatória.' },
        { status: 400 }
      );
    }

    const startedAt = Date.now();
    let status = 0;
    let ok = false;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);

      if (provider?.type === 'ANIME_SDK') {
        const key = getAnimeSdkProviderKey(provider.name);
        if (!key) throw new Error('Adaptador AnimeSDK não reconhecido.');
        const result = await testAnimeSdkProvider(key, controller.signal);
        status = 200;
        ok = result.sourceCount > 0;
      } else {
        const response = await fetch(targetUrl, {
          method:
            targetUrl.includes('api') || targetUrl.includes('koyeb')
              ? 'GET'
              : 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'AniStream-ProviderTester/2.0',
            Accept: 'application/json, text/html, */*',
          },
          cache: 'no-store',
        });
        status = response.status;
        ok = response.ok || [200, 206, 301, 302].includes(status);
        if (!ok) error = `Resposta HTTP de erro (${status})`;
      }

      clearTimeout(timeoutId);
    } catch (caught) {
      const caughtError = caught as Error;
      ok = false;
      status = caughtError.name === 'AbortError' ? 504 : 500;
      error =
        caughtError.name === 'AbortError'
          ? 'Teste funcional excedeu 20 segundos.'
          : caughtError.message || 'Erro ao testar o provedor.';
    }

    const latencyMs = Date.now() - startedAt;
    if (provider) {
      await prisma.mediaProvider.update({
        where: { id: provider.id },
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
      error,
      testedAt: new Date().toISOString(),
    });
  } catch (caught) {
    return NextResponse.json(
      { error: (caught as Error).message },
      { status: 500 }
    );
  }
}
