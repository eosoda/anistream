import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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

// POST: Criar novo anúncio em lote (Admin)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, type = 'INFO', targetGroup = 'all' } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const announcement = await prisma.systemAnnouncement.create({
      data: {
        title,
        content,
        type,
        targetGroup,
        active: true,
      },
    });

    return NextResponse.json({ success: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Deletar ou desativar anúncio
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
