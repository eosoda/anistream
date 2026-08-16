import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { assertSameOrigin } from '@/lib/security/request-origin';

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const token = request.cookies.get('admin_token')?.value;

  if (token) {
    await prisma.adminSession.deleteMany({
      where: { token },
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
