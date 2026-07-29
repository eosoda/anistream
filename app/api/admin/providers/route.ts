import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { autoAuthorizeHostnames, invalidateAuthorizedHostsCache } from '@/lib/security/allowed-hosts';

// Provedores padrão pré-configurados inicializáveis
const DEFAULT_PROVIDERS = [
  {
    name: 'Provedor M3U Principal Autorizado',
    type: 'M3U',
    url: 'https://media.mydomain.com/playlists/main-anistream.m3u',
    priority: 100,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'Servidor Espelho JSON Configurado',
    type: 'JSON',
    url: 'https://cdn.mydomain.com/api/sources.json',
    priority: 80,
    enabled: true,
    autoIndex: false,
  },
];

// GET: Listar todos os provedores cadastrados (ou popular com padrões se vazio)
export async function GET() {
  try {
    let providers = await prisma.mediaProvider.findMany({
      orderBy: { priority: 'desc' },
    });

    if (providers.length === 0) {
      for (const p of DEFAULT_PROVIDERS) {
        await prisma.mediaProvider.create({ data: p });
      }
      providers = await prisma.mediaProvider.findMany({
        orderBy: { priority: 'desc' },
      });
    }

    return NextResponse.json({ providers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Criar novo provedor de mídia
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type = 'M3U', url, priority = 100, enabled = true, autoIndex = true } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Nome e URL do provedor são obrigatórios.' }, { status: 400 });
    }

    const provider = await prisma.mediaProvider.create({
      data: {
        name,
        type,
        url,
        priority: Number(priority),
        enabled: Boolean(enabled),
        autoIndex: Boolean(autoIndex),
      },
    });

    // Auto-autorizar o hostname da URL do provedor e invalidar o cache em memória
    await autoAuthorizeHostnames([url]);
    invalidateAuthorizedHostsCache();

    return NextResponse.json({ success: true, provider });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Alternar status (enabled / autoIndex) ou editar provedor
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, enabled, autoIndex, name, url, priority } = body;

    if (!id) return NextResponse.json({ error: 'ID do provedor é obrigatório.' }, { status: 400 });

    const updateData: any = {};
    if (enabled !== undefined) updateData.enabled = Boolean(enabled);
    if (autoIndex !== undefined) updateData.autoIndex = Boolean(autoIndex);
    if (name) updateData.name = name;
    if (url) updateData.url = url;
    if (priority !== undefined) updateData.priority = Number(priority);

    const updated = await prisma.mediaProvider.update({
      where: { id },
      data: updateData,
    });

    if (url) {
      await autoAuthorizeHostnames([url]);
    }
    invalidateAuthorizedHostsCache();

    return NextResponse.json({ success: true, provider: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remover um provedor
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID do provedor é obrigatório.' }, { status: 400 });

    await prisma.mediaProvider.delete({ where: { id } });
    invalidateAuthorizedHostsCache();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
