import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CreateWebhookSchema } from '@/schemas/admin';

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
    const { action = 'create', url, platform = 'DISCORD' } = body;

    if (action === 'test') {
      if (!url) return NextResponse.json({ error: 'URL do Webhook necessária.' }, { status: 400 });

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
                color: 16738560,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      }

      return NextResponse.json({ success: true, message: 'Notificação de teste disparada com sucesso!' });
    }

    const parseResult = CreateWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos para o webhook.', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    const webhook = await prisma.webhookConfig.create({
      data: {
        platform: input.platform,
        name: input.name,
        url: input.url,
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
