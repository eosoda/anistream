import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);

    if (!authResult.authenticated) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: authResult.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error('[Admin Me Error]', error);
    return NextResponse.json({ authenticated: false, error: 'Não foi possível validar a sessão.' }, { status: 500 });
  }
}
