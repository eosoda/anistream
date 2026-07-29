import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decryptData } from '@/lib/security/crypto';
import { verifyPlaybackToken } from '@/lib/security/playback-token';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // 1. Protection against rate limit abuse
  const rateLimit = checkRateLimit(request, 'stream-proxy', {
    limit: 120,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de solicitações de streaming excedido.' },
      { status: 429 }
    );
  }

  // 2. Validate Signed Playback Token
  if (!token) {
    return NextResponse.json(
      { error: 'Acesso negado: Token de reprodução assinado ausente.' },
      { status: 401 }
    );
  }

  const tokenVerification = await verifyPlaybackToken(token, sourceId);
  if (!tokenVerification.valid) {
    return NextResponse.json(
      { error: tokenVerification.reason || 'Token de reprodução inválido.' },
      { status: 403 }
    );
  }

  // 3. Load source directly from DB (Never trust arbitrary URLs from browser)
  const source = await prisma.episodeSource.findUnique({
    where: { id: sourceId },
  });

  if (!source || !source.enabled) {
    return NextResponse.json(
      { error: 'Fonte de mídia não encontrada ou desativada.' },
      { status: 404 }
    );
  }

  // Check expiration if set
  if (source.expiresAt && new Date(source.expiresAt) < new Date()) {
    return NextResponse.json(
      { error: 'Fonte de streaming expirada.' },
      { status: 410 }
    );
  }

  // Decrypt real media URL and headers
  const realUrl = decryptData(source.urlEncrypted);
  let decryptedHeaders: Record<string, string> = {};

  if (source.headersEncrypted) {
    try {
      decryptedHeaders = JSON.parse(decryptData(source.headersEncrypted));
    } catch {
      decryptedHeaders = {};
    }
  }

  // 4. SSRF & Host Allowlist Validation
  const ssrfCheck = await validateUrlSsrf(realUrl);
  if (!ssrfCheck.valid) {
    return NextResponse.json(
      { error: `Acesso à fonte de mídia bloqueado: ${ssrfCheck.reason}` },
      { status: 403 }
    );
  }

  // 5. Forward HTTP Range headers for seeking in media players
  const range = request.headers.get('range');
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': 'AniStream-SecureProxy/1.0',
    ...decryptedHeaders,
  };

  if (range) {
    upstreamHeaders['Range'] = range;
  }

  try {
    const mediaResponse = await fetch(realUrl, {
      method: 'GET',
      headers: upstreamHeaders,
    });

    if (!mediaResponse.ok && mediaResponse.status !== 206) {
      return NextResponse.json(
        { error: `Falha ao obter mídia upstream: ${mediaResponse.statusText}` },
        { status: mediaResponse.status }
      );
    }

    // 6. Build response headers forwarding Content-Type, Content-Length, Content-Range
    const responseHeaders = new Headers();

    const contentType =
      mediaResponse.headers.get('content-type') ||
      (source.type === 'hls'
        ? 'application/vnd.apple.mpegurl'
        : 'video/mp4');
    responseHeaders.set('Content-Type', contentType);

    const contentLength = mediaResponse.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = mediaResponse.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const acceptRanges = mediaResponse.headers.get('accept-ranges');
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    }

    // Header CORS controlado pelo nosso servidor
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );

    // 7. Stream Response body directly without buffering complete video
    return new NextResponse(mediaResponse.body, {
      status: mediaResponse.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro de proxy de streaming', message: err.message },
      { status: 500 }
    );
  }
}
