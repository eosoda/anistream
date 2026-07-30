import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { autoAuthorizeHostnames, invalidateAuthorizedHostsCache } from '@/lib/security/allowed-hosts';

// 8 Provedores padrão pré-configurados inicializáveis
const DEFAULT_PROVIDERS = [
  {
    name: 'Kenjitsu / AniZone',
    type: 'EXTERNAL_API',
    url: 'https://kenjitsu.koyeb.app/api/anizone',
    priority: 100,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'GogoAnime (Consumet)',
    type: 'EXTERNAL_API',
    url: 'https://api-consumet-org-five.vercel.app',
    priority: 90,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'HiAnime / Zoro',
    type: 'EXTERNAL_API',
    url: 'https://consumet-api-1.vercel.app',
    priority: 85,
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
    name: 'AnimesOnline Scraper',
    type: 'EXTERNAL_API',
    url: 'https://animesonline.cloud',
    priority: 75,
    enabled: true,
    autoIndex: true,
  },
  {
    name: 'WarezCDN / Superflix',
    type: 'EMBED',
    url: 'https://superflixapi.pro',
    priority: 70,
    enabled: true,
    autoIndex: false,
  },
  {
    name: 'XPass / 2Embed',
    type: 'EMBED',
    url: 'https://play.xpass.top',
    priority: 60,
    enabled: true,
    autoIndex: false,
  },
  {
    name: 'Catálogo M3U Autorizado',
    type: 'M3U',
    url: 'https://m3u-catalog.local',
    priority: 50,
    enabled: true,
    autoIndex: false,
  },
];

// GET: Listar todos os provedores cadastrados (ou popular com padrões se necessário)
export async function GET() {
  try {
    // Remover provedores fictícios ou descontinuados legados
    await prisma.mediaProvider.deleteMany({
      where: {
        OR: [
          { url: { contains: 'mydomain.com' } },
          { url: { contains: 'exemplo.com' } },
          { url: { contains: 'example.com' } },
          { name: { contains: 'TVmaze' } },
          { name: { contains: 'Miruro' } },
          { name: { contains: 'ApiPlayer' } },
        ],
      },
    });

    let providers = await prisma.mediaProvider.findMany({
      orderBy: { priority: 'desc' },
    });

    // Se novos provedores não existirem, popular
    const existingNames = new Set(providers.map((p: any) => p.name));
    for (const p of DEFAULT_PROVIDERS) {
      if (!existingNames.has(p.name)) {
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
