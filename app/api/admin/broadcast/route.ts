import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CreateAnnouncementSchema } from '@/schemas/admin';

// GET: Listar todos os anúncios (Admin)
export async function GET() {
  try {
    const announcements = await prisma.systemAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ announcements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Criar novo anúncio em lote (Admin) com Validação Zod
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = CreateAnnouncementSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos para o anúncio.', details: parseResult.error.flatten() },
        { status: 400 }
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
      },
    });

    return NextResponse.json({ success: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Deletar anúncio
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do anúncio é obrigatório' }, { status: 400 });
    }

    await prisma.systemAnnouncement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
