import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ webhooks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { platform, name, url, action = 'create' } = body;

    if (action === 'test') {
      if (!url) return NextResponse.json({ error: 'URL do Webhook necessária.' }, { status: 400 });

      // Disparar Webhook de Teste (Discord Rich Embed ou Telegram Message)
      if (platform === 'DISCORD' || url.includes('discord.com')) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'AniStream Bot',
            embeds: [
              {
                title: '🎬 Teste de Webhook - AniStream',
                description: 'As notificações automáticas de novos episódios estão funcionando perfeitamente!',
                color: 16738560, // #FF6B00
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      }

      return NextResponse.json({ success: true, message: 'Notificação de teste disparada com sucesso!' });
    }

    if (!platform || !name || !url) {
      return NextResponse.json({ error: 'Plataforma, nome e URL são obrigatórios.' }, { status: 400 });
    }

    const webhook = await prisma.webhookConfig.create({
      data: {
        platform: platform.toUpperCase(),
        name,
        url,
        enabled: true,
      },
    });

    return NextResponse.json({ success: true, webhook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

    await prisma.webhookConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
