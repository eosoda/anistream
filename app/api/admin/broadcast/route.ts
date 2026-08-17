import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CreateAnnouncementSchema } from '@/schemas/admin';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';

// GET: Listar todos os anúncios (Admin)
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const announcements = await prisma.systemAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('[Admin Broadcast Read Error]', error);
    return NextResponse.json({ error: 'Não foi possível carregar os comunicados.' }, { status: 500 });
  }
}

// POST: Criar novo anúncio em lote (Admin) com Validação Zod
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const body = await req.json();
    const parseResult = CreateAnnouncementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos para o anúncio.',
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parseResult.data;

    const announcement = await prisma.systemAnnouncement.create({
      data: {
        title: input.title,
        content: input.content,
        type: input.type,
        targetGroup: input.targetGroup,
        active: true,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        priority: input.priority,
        placement: input.placement,
        ctaLabel: input.ctaLabel || null,
        ctaHref: input.ctaHref || null,
      },
    });

    void recordAdminAudit({
      actorId: auth.userId,
      action: 'broadcast.created',
      resourceType: 'broadcast',
      resourceId: announcement.id,
      summary: `Comunicado “${announcement.title}” publicado.`,
      metadata: {
        type: announcement.type,
        targetGroup: announcement.targetGroup,
      },
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error('[Admin Broadcast Create Error]', error);
    return NextResponse.json({ error: 'Não foi possível criar o comunicado.' }, { status: 500 });
  }
}

// DELETE: Deletar anúncio
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do anúncio é obrigatório' }, { status: 400 });
    }

    const announcement = await prisma.systemAnnouncement.delete({
      where: { id },
    });
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'broadcast.deleted',
      resourceType: 'broadcast',
      resourceId: id,
      summary: `Comunicado “${announcement.title}” excluído.`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Broadcast Delete Error]', error);
    return NextResponse.json({ error: 'Não foi possível excluir o comunicado.' }, { status: 500 });
  }
}
