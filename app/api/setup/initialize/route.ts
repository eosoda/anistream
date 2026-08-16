import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/password';
import { validateSetupKey, clearSetupKey } from '@/lib/security/setup-key';
import { assertSameOrigin } from '@/lib/security/request-origin';

const InitializeSchema = z.object({
  setupKey: z.string().trim().optional(),
  admin: z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(2).max(100),
    password: z.string().min(12).max(256),
  }),
});

class AlreadyInitializedError extends Error {}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const body = await request.json().catch(() => null);
    const parsed = InitializeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados de instalação inválidos.' }, { status: 400 });
    }

    const { admin, setupKey } = parsed.data;
    const keyToValidate = setupKey || request.headers.get('x-setup-key');
    if (!validateSetupKey(keyToValidate)) {
      return NextResponse.json({ error: 'Chave de instalacao invalida ou ausente.' }, { status: 403 });
    }

    const sessionToken = `adm_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const passwordHash = await hashPassword(admin.password);
    const newAdmin = await prisma.$transaction(async (tx) => {
      if (await tx.adminUser.count()) {
        throw new AlreadyInitializedError('already_initialized');
      }

      const createdAdmin = await tx.adminUser.create({
        data: {
          email: admin.email,
          name: admin.name,
          passwordHash,
        },
      });
      await tx.adminSession.create({ data: { token: sessionToken, userId: createdAdmin.id, expiresAt } });
      return createdAdmin;
    });
    clearSetupKey();

    const response = NextResponse.json({
      success: true,
      message: 'Aplicacao configurada com sucesso. O catalogo e as fontes serao consultados pelo Kenjitsu self-hosted.',
      admin: { id: newAdmin.id, email: newAdmin.email, name: newAdmin.name },
      integration: 'kenjitsu',
    });
    response.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof AlreadyInitializedError) {
      return NextResponse.json({ error: 'A aplicação já foi instalada e configurada.' }, { status: 403 });
    }
    console.error('[Setup Initialize Error]', error);
    return NextResponse.json({ error: 'Erro interno ao inicializar a aplicação.' }, { status: 500 });
  }
}
