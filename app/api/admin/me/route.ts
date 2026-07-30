import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);

    if (!authResult.authenticated) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    if (authResult.userId === 'admin-master') {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 'admin-master',
          email: 'admin@anistream.com',
          name: 'Administrador Mestre',
        },
      });
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
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
