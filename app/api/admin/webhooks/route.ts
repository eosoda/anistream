import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CreateWebhookSchema } from '@/schemas/admin';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authenticated) return auth.errorResponse!;
    const webhooks = await prisma.webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ webhooks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const body = await req.json();
    const { action = 'create', url, platform = 'DISCORD' } = body;

    if (action === 'test') {
      if (typeof url !== 'string' || !url.trim()) return NextResponse.json({ error: 'URL do Webhook necessária.' }, { status: 400 });
      let webhookHost: string;
      try {
        webhookHost = new URL(url).host;
      } catch {
        return NextResponse.json({ error: 'URL do Webhook inválida.' }, { status: 400 });
      }
      void recordAdminAudit({ actorId: auth.userId, action: 'webhook.tested', resourceType: 'webhook', summary: 'Teste de webhook disparado.', metadata: { platform, host: webhookHost } });

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

    void recordAdminAudit({ actorId: auth.userId, action: 'webhook.created', resourceType: 'webhook', resourceId: webhook.id, summary: `Webhook “${webhook.name}” criado.`, metadata: { platform: webhook.platform } });

    return NextResponse.json({ success: true, webhook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

    const webhook = await prisma.webhookConfig.delete({ where: { id } });
    void recordAdminAudit({ actorId: auth.userId, action: 'webhook.deleted', resourceType: 'webhook', resourceId: id, summary: `Webhook “${webhook.name}” excluído.`, metadata: { platform: webhook.platform } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
