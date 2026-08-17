import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { assertSameOrigin } from '@/lib/security/request-origin';
import { hashAdminSessionToken } from '@/lib/security/admin-auth';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const token = request.cookies.get('admin_token')?.value;

  if (token) {
    await prisma.adminSession.deleteMany({
      where: { OR: [{ tokenHash: hashAdminSessionToken(token) }, { token }] },
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', expires: new Date(0), path: '/' });
  return response;
}
