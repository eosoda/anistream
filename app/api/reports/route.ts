import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET: Listar chamados de erro (Admin)
export async function GET() {
  try {
    const reports = await prisma.episodeReport.findMany({
      include: {
        episode: {
          include: {
            anime: { select: { title: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Criar chamado de erro (Player pelo Usuário)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { episodeId, type = 'OTHER', description } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'ID do episódio é obrigatório.' }, { status: 400 });
    }

    const report = await prisma.episodeReport.create({
      data: {
        episodeId,
        type,
        description,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Obrigado! Seu relato de problema foi enviado aos administradores.',
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Atualizar status do chamado (Admin)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 });
    }

    const updated = await prisma.episodeReport.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
