import { NextRequest, NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/security/crypto';
import { verifyPlaybackToken } from '@/lib/security/playback-token';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';

interface RelayDescriptor {
  sourceId: string;
  url: string;
  type: string;
  headers?: Record<string, string>;
}

function relayUrl(
  request: NextRequest,
  descriptor: RelayDescriptor,
  token: string,
  targetUrl: string
): string {
  const payload = encryptData(
    JSON.stringify({ ...descriptor, url: targetUrl })
  );
  return `/api/streams/relay?token=${encodeURIComponent(
    token
  )}&payload=${encodeURIComponent(payload)}`;
}

function rewriteHlsManifest(
  manifest: string,
  request: NextRequest,
  descriptor: RelayDescriptor,
  token: string
): string {
  const rewrite = (value: string) =>
    relayUrl(
      request,
      descriptor,
      token,
      new URL(value, descriptor.url).toString()
    );

  return manifest
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      if (line.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) =>
          `URI="${rewrite(uri)}"`
        );
      }
      return rewrite(line.trim());
    })
    .join('\n');
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 'stream-relay', {
    limit: 600,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de solicitações de mídia excedido.' },
      { status: 429 }
    );
  }

  const token = request.nextUrl.searchParams.get('token');
  const encryptedPayload = request.nextUrl.searchParams.get('payload');
  if (!token || !encryptedPayload) {
    return NextResponse.json(
      { error: 'Token ou descritor de mídia ausente.' },
      { status: 401 }
    );
  }

  let descriptor: RelayDescriptor;
  try {
    descriptor = JSON.parse(decryptData(encryptedPayload));
  } catch {
    return NextResponse.json(
      { error: 'Descritor de mídia inválido.' },
      { status: 400 }
    );
  }

  const verification = await verifyPlaybackToken(token, descriptor.sourceId);
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.reason || 'Token inválido.' },
      { status: 403 }
    );
  }

  // O descritor só pode ser criado pelo servidor (AES-GCM autenticado). Ainda
  // bloqueamos protocolos e redes privadas, mas CDNs efêmeros não precisam
  // estar previamente cadastrados na allowlist administrativa.
  const ssrf = await validateUrlSsrf(descriptor.url, {
    requireAuthorizedHost: false,
  });
  if (!ssrf.valid) {
    return NextResponse.json(
      { error: `Destino de mídia bloqueado: ${ssrf.reason}` },
      { status: 403 }
    );
  }

  const range = request.headers.get('range');
  const headers: Record<string, string> = {
    Accept: '*/*',
    ...(descriptor.headers || {}),
  };
  if (range) headers.Range = range;

  try {
    const upstream = await fetch(descriptor.url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: `Mídia upstream respondeu HTTP ${upstream.status}.` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest =
      contentType.toLowerCase().includes('mpegurl') ||
      descriptor.url.toLowerCase().includes('.m3u8');

    if (isManifest) {
      const manifest = await upstream.text();
      if (manifest.includes('#EXTM3U')) {
        return new NextResponse(
          rewriteHlsManifest(manifest, request, descriptor, token),
          {
            status: upstream.status,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-store',
            },
          }
        );
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      'Content-Type',
      contentType || 'application/octet-stream'
    );
    for (const header of [
      'content-length',
      'content-range',
      'accept-ranges',
    ]) {
      const value = upstream.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }
    responseHeaders.set('Cache-Control', 'no-store');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao retransmitir mídia.',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 502 }
    );
  }
}
