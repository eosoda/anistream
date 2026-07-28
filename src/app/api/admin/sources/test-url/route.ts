import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { validateStreamSource } from '@/lib/streams/validator';
import { generatePlaybackToken } from '@/lib/security/playback-token';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { url, type = 'hls' } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL para teste é obrigatória' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 1. SSRF & Host Validation Check
    const ssrfCheck = await validateUrlSsrf(url);
    if (!ssrfCheck.valid) {
      return NextResponse.json({
        valid: false,
        ssrfPass: false,
        reason: ssrfCheck.reason,
        latencyMs: Date.now() - startTime,
      });
    }

    // 2. Server-side Stream Validation
    const sourceMock = {
      id: 'test-source-temp',
      provider: 'admin-tester',
      url,
      type: type as 'hls' | 'mp4',
    };

    const validation = await validateStreamSource(sourceMock, 5000);

    // 3. Generate Temporary Signed Token for Mini-Player Preview
    let previewToken = null;
    if (validation.valid) {
      previewToken = await generatePlaybackToken('test-source-temp', undefined, 10);
    }

    return NextResponse.json({
      valid: validation.valid,
      ssrfPass: true,
      resolvedIp: ssrfCheck.resolvedIp,
      status: validation.status,
      type: validation.type,
      latencyMs: validation.latencyMs,
      isMasterPlaylist: validation.isMasterPlaylist || false,
      error: validation.error || null,
      previewToken,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao testar URL de mídia', message: err.message },
      { status: 500 }
    );
  }
}
