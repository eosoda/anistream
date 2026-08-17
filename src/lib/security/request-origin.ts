import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const requestOrigin = request.nextUrl.origin;
  const configuredOrigin = normalizeOrigin(env.NEXT_PUBLIC_APP_URL);
  const allowedOrigins = new Set([requestOrigin, configuredOrigin].filter(Boolean));

  const origin = normalizeOrigin(request.headers.get('origin'));
  if (origin) return allowedOrigins.has(origin);

  const refererOrigin = normalizeOrigin(request.headers.get('referer'));
  if (refererOrigin) return allowedOrigins.has(refererOrigin);

  // Requests without Origin/Referer are allowed only when the caller uses an
  // explicit Authorization header. Cookie-authenticated mutations must carry
  // browser origin metadata so they cannot be replayed cross-site.
  return Boolean(request.headers.get('authorization'));
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  if (isSameOriginRequest(request)) return null;

  return NextResponse.json(
    { error: 'Origem da solicitação não permitida.' },
    { status: 403 },
  );
}
