import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/password';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';
import { assertSameOrigin } from '@/lib/security/request-origin';
import { hashAdminSessionToken } from '@/lib/security/admin-auth';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const ipLimit = await checkDistributedRateLimit(`admin-login:ip:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    }, { failClosed: true });
    if (!ipLimit.allowed) {
      const status = ipLimit.backend === 'unavailable' ? 503 : 429;
      return NextResponse.json(
        { error: 'Login temporariamente indisponível. Tente novamente mais tarde.' },
        { status, headers: rateLimitHeaders(ipLimit) },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const accountLimit = await checkDistributedRateLimit(`admin-login:account:${email}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    }, { failClosed: true });
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: accountLimit.backend === 'unavailable' ? 'Login temporariamente indisponível. Tente novamente mais tarde.' : 'Muitas tentativas de login. Tente novamente mais tarde.' },
        { status: accountLimit.backend === 'unavailable' ? 503 : 429, headers: rateLimitHeaders(accountLimit) },
      );
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    // Gerar token de sessão
    const token = `adm_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await prisma.adminSession.create({
      data: {
        tokenHash: hashAdminSessionToken(token),
        userId: user.id,
        expiresAt,
      },
    });

    // Definir cookie HTTP-Only seguro
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Admin Login Error]', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar login.' },
      { status: 500 }
    );
  }
}
