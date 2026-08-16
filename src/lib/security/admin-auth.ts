import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../db/prisma';
import { isSameOriginRequest } from './request-origin';

export async function verifyAdminAuth(
  request: NextRequest
): Promise<{ authenticated: boolean; userId?: string; errorResponse?: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  const cookieToken = request.cookies.get('admin_token')?.value || null;

  if (!bearerToken && cookieToken && !isSameOriginRequest(request)) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Origem da solicitação não permitida.' },
        { status: 403 },
      ),
    };
  }

  const token = bearerToken || cookieToken;

  if (!token) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Não autorizado: Token administrativo ausente' },
        { status: 401 }
      ),
    };
  }

  return verifyAdminToken(token);
}

export async function verifyAdminToken(
  token: string
): Promise<{ authenticated: boolean; userId?: string; errorResponse?: NextResponse }> {
  const session = await prisma.adminSession.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt < new Date()) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { error: 'Sessão administrativa inválida ou expirada' },
        { status: 401 }
      ),
    };
  }

  return { authenticated: true, userId: session.userId };
}
