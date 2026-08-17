import { NextRequest, NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/security/crypto';
import { verifyPlaybackToken } from '@/lib/security/playback-token';
import { safeFetch, readResponseTextLimited, filterUpstreamHeaders, withIdleTimeout } from '@/lib/security/safe-fetch';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';

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
  const rateLimit = await checkDistributedRateLimit(`stream-relay:${getClientIp(request)}`, {
    limit: 600,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Limite de solicitações de mídia excedido.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
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
    if (!descriptor || typeof descriptor.sourceId !== 'string' || typeof descriptor.url !== 'string' || typeof descriptor.type !== 'string') throw new Error('invalid_descriptor');
  } catch {
    return NextResponse.json(
      { error: 'Descritor de mídia inválido.' },
      { status: 400 }
    );
  }

  const verification = await verifyPlaybackToken(token, descriptor.sourceId);
  if (!verification.valid) {
    return NextResponse.json(
      { error: 'Token de reprodução inválido.' },
      { status: 403 }
    );
  }

  const range = request.headers.get('range');
  const headers = filterUpstreamHeaders({
    Accept: '*/*',
    ...(descriptor.headers || {}),
  });
  if (range) headers.Range = range;

  try {
    const upstream = await safeFetch(descriptor.url, {
      headers,
      cache: 'no-store',
      timeoutMs: 30000,
    });
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: 'A fonte de mídia não respondeu com sucesso.' },
        { status: upstream.status, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest =
      contentType.toLowerCase().includes('mpegurl') ||
      descriptor.url.toLowerCase().includes('.m3u8');

    if (isManifest) {
      const manifest = await readResponseTextLimited(upstream, 512 * 1024, 30000);
      if (manifest.includes('#EXTM3U')) {
        return new NextResponse(
          rewriteHlsManifest(manifest, request, descriptor, token),
          {
            status: upstream.status,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-store',
              ...rateLimitHeaders(rateLimit),
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
    Object.entries(rateLimitHeaders(rateLimit)).forEach(([key, value]) => responseHeaders.set(key, value));

    return new NextResponse(upstream.body ? withIdleTimeout(upstream.body, 30000) : null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Stream Relay Error]', error instanceof Error ? error.message : 'Falha desconhecida');
    return NextResponse.json(
      {
        error: 'Falha ao retransmitir mídia.',
      },
      { status: 502 }
    );
  }
}
