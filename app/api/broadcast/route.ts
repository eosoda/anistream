import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const now = new Date();
    const announcements = await prisma.systemAnnouncement.findMany({
      where: {
        active: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
    return NextResponse.json(
      { announcements },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json({ announcements: [] });
  }
}
