import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { parseAuditMetadata } from '@/lib/admin/audit';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const searchParams = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '25', 10) || 25));
  const where: Prisma.AdminAuditLogWhereInput = {};
  const resourceType = searchParams.get('resourceType');
  const resourceId = searchParams.get('resourceId');
  const action = searchParams.get('action');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  try {
    const [entries, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        actorName: entry.actor?.name || entry.actor?.email || (entry.actorId ? 'Administrador' : 'Sistema'),
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        summary: entry.summary,
        metadata: parseAuditMetadata(entry.metadataJson),
        createdAt: entry.createdAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('[Admin Audit Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar o histórico administrativo.' }, { status: 503 });
  }
}
