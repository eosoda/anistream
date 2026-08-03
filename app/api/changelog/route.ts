import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';

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

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
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

    void recordAdminAudit({ actorId: auth.userId, action: 'release.created', resourceType: 'release', resourceId: release.id, summary: `Release ${release.version} publicada.`, metadata: { title: release.title, type: release.type } });

    return NextResponse.json({ success: true, release });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
