import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { autoAuthorizeHostnames, invalidateAuthorizedHostsCache } from '@/lib/security/allowed-hosts';

// Provedores padrão pré-configurados inicializáveis
const DEFAULT_PROVIDERS = [
  {
    name: 'AniZone / Kenjitsu API',
    type: 'EXTERNAL_API',
    url: 'https://kenjitsu.koyeb.app/api/anizone',
    priority: 100,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'Miruro TV API',
    type: 'EXTERNAL_API',
    url: 'https://mirurotvapi.vercel.app/api',
    priority: 90,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'Anify API',
    type: 'EXTERNAL_API',
    url: 'https://api.anify.tv',
    priority: 80,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'Consumet / Gogoanime API',
    type: 'EXTERNAL_API',
    url: 'https://api.consumet.org',
    priority: 70,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'TVmaze API (Episódios & Temporadas)',
    type: 'EXTERNAL_API',
    url: 'https://api.tvmaze.com',
    priority: 60,
    enabled: true,
    autoIndex: false,
  },
  {
    name: '2Embed Player',
    type: 'EMBED',
    url: 'https://www.2embed.cc',
    priority: 50,
    enabled: true,
    autoIndex: false,
  },
  {
    name: 'Xpass Player',
    type: 'EMBED',
    url: 'https://play.xpass.top',
    priority: 40,
    enabled: true,
    autoIndex: false,
  },
  {
    name: 'ApiPlayer',
    type: 'EMBED',
    url: 'https://apiplayer.ru',
    priority: 30,
    enabled: true,
    autoIndex: false,
  },
  {
    name: 'Provedor M3U Principal Autorizado',
    type: 'M3U',
    url: 'https://media.mydomain.com/playlists/main-anistream.m3u',
    priority: 20,
    enabled: true,
    autoIndex: true,
  },
];

// GET: Listar todos os provedores cadastrados (ou popular com padrões se necessário)
export async function GET() {
  try {
    let providers = await prisma.mediaProvider.findMany({
      orderBy: { priority: 'desc' },
    });

    // Se nenhum provedor existe, popular tudo. Se existirem apenas alguns legados, garantir os novos
    const existingUrls = new Set(providers.map((p: any) => p.url));
    for (const p of DEFAULT_PROVIDERS) {
      if (!existingUrls.has(p.url)) {
        await prisma.mediaProvider.create({ data: p });
      }
    }

    providers = await prisma.mediaProvider.findMany({
      orderBy: { priority: 'desc' },
    });

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
