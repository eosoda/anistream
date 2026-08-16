import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/password';
import { checkDistributedRateLimit, getClientIp } from '@/lib/security/rate-limit';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkDistributedRateLimit(`admin-login:ip:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(ipLimit.resetMs / 1000)) } },
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
    });
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(accountLimit.resetMs / 1000)) } },
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
        token,
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
      sameSite: 'lax',
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
