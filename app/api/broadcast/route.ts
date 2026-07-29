import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const announcements = await prisma.systemAnnouncement.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return NextResponse.json({ announcements });
  } catch (err: any) {
    return NextResponse.json({ announcements: [] });
  }
}
