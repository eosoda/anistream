import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
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
