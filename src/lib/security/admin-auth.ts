import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../db/prisma';
import { isSameOriginRequest } from './request-origin';

export function hashAdminSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function unauthorized(message = 'Não autorizado.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function verifyAdminAuth(
  request: NextRequest,
): Promise<{ authenticated: boolean; userId?: string; errorResponse?: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const cookieToken = request.cookies.get('admin_token')?.value || null;

  if (!bearerToken && cookieToken && !isSameOriginRequest(request)) {
    return { authenticated: false, errorResponse: NextResponse.json({ error: 'Origem da solicitação não permitida.' }, { status: 403 }) };
  }

  const token = bearerToken || cookieToken;
  if (!token) return { authenticated: false, errorResponse: unauthorized() };
  return verifyAdminToken(token);
}

export async function verifyAdminToken(
  token: string,
): Promise<{ authenticated: boolean; userId?: string; errorResponse?: NextResponse }> {
  const tokenHash = hashAdminSessionToken(token);
  let session = await prisma.adminSession.findUnique({ where: { tokenHash } });

  // One-way compatibility for sessions created before the beta migration.
  // A successful legacy request immediately replaces the plaintext value.
  if (!session) {
    const legacySession = await prisma.adminSession.findUnique({ where: { token } });
    if (legacySession) {
      session = legacySession;
      if (legacySession.expiresAt >= new Date()) {
        await prisma.adminSession.update({
          where: { id: legacySession.id },
          data: { tokenHash, token: null },
        });
      }
    }
  }

  void prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);

  if (!session || session.expiresAt < new Date()) return { authenticated: false, errorResponse: unauthorized('Sessão administrativa inválida ou expirada.') };
  return { authenticated: true, userId: session.userId };
}
