import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/password';

export async function POST(request: NextRequest) {
  try {
    const count = await prisma.adminUser.count();

    if (count > 0) {
      return NextResponse.json(
        { message: 'Já existem administradores cadastrados no sistema.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = (body.email || 'admin@anistream.com').toLowerCase().trim();
    const password = body.password || 'admin123456';
    const name = body.name || 'Administrador Principal';

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha inicial deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const admin = await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        message: 'Administrador inicial criado com sucesso!',
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao criar administrador inicial', message: err.message },
      { status: 500 }
    );
  }
}
