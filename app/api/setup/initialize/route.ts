import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/password';
import { validateSetupKey, clearSetupKey } from '@/lib/security/setup-key';

export async function POST(request: NextRequest) {
  try {
    if (await prisma.adminUser.count()) {
      return NextResponse.json({ error: 'A aplicacao ja foi instalada e configurada.' }, { status: 403 });
    }

    const body = await request.json();
    const { admin, setupKey } = body;
    const keyToValidate = setupKey || request.headers.get('x-setup-key');
    if (!validateSetupKey(keyToValidate)) {
      return NextResponse.json({ error: 'Chave de instalacao invalida ou ausente.' }, { status: 403 });
    }
    if (!admin?.email || !admin?.password || !admin?.name) {
      return NextResponse.json({ error: 'Nome, e-mail e senha do administrador sao obrigatorios.' }, { status: 400 });
    }
    if (admin.password.length < 6) {
      return NextResponse.json({ error: 'A senha do administrador deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const newAdmin = await prisma.adminUser.create({
      data: {
        email: admin.email.toLowerCase().trim(),
        name: admin.name.trim(),
        passwordHash: await hashPassword(admin.password),
      },
    });
    clearSetupKey();

    const sessionToken = `adm_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.adminSession.create({ data: { token: sessionToken, userId: newAdmin.id, expiresAt } });

    const response = NextResponse.json({
      success: true,
      message: 'Aplicacao configurada com sucesso.',
      admin: { id: newAdmin.id, email: newAdmin.email, name: newAdmin.name },
      m3uImportSummary: {
        disabled: true,
        message: 'Playlists M3U nao sao mais usadas. As fontes sao resolvidas ao vivo pelas extensoes Kenjitsu.',
      },
    });
    response.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao inicializar aplicacao', message: error.message }, { status: 500 });
  }
}
