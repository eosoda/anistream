import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { prisma } from '../db/prisma';

export async function verifyAdminAuth(
  request: NextRequest
): Promise<{ authenticated: boolean; userId?: string; errorResponse?: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    token = request.cookies.get('admin_token')?.value || null;
  }

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

  // Se o token for a chave mestra simples configurada nas envs
  if (token === env.ADMIN_SESSION_SECRET) {
    return { authenticated: true, userId: 'admin-master' };
  }

  // Buscar sessão de administrador no banco de dados
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
