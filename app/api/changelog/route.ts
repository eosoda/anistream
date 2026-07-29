import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const releases = await prisma.changelogRelease.findMany({
      orderBy: { releasedAt: 'desc' },
    });
    return NextResponse.json({ releases });
  } catch (err: any) {
    return NextResponse.json({ releases: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { version, title, content, type = 'FEATURE' } = body;

    if (!version || !title || !content) {
      return NextResponse.json({ error: 'Versão, título e conteúdo são obrigatórios.' }, { status: 400 });
    }

    const release = await prisma.changelogRelease.create({
      data: {
        version,
        title,
        content,
        type,
        releasedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, release });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
