import { prisma } from '@/lib/db/prisma';

export interface WebhookPayload {
  title: string;
  description: string;
  type?: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export async function dispatchWebhooks(payload: WebhookPayload): Promise<void> {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { enabled: true },
    });

    if (!webhooks || webhooks.length === 0) return;

    const colorMap = {
      INFO: 0x3b82f6,
      WARNING: 0xf59e0b,
      ERROR: 0xef4444,
      SUCCESS: 0x10b981,
    };

    const embedColor = colorMap[payload.type || 'INFO'] || 0xff6b00;

    for (const hook of webhooks) {
      if (hook.platform === 'DISCORD') {
        fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'AniStream Bot',
            avatar_url: 'https://anistream.app/logo.png',
            embeds: [
              {
                title: payload.title,
                description: payload.description,
                color: embedColor,
                fields: payload.fields || [],
                timestamp: new Date().toISOString(),
                footer: { text: 'AniStream Webhook Notifier' },
              },
            ],
          }),
        }).catch((err) => {
          console.error(`[Webhook] Error sending to Discord hook (${hook.id}):`, err);
        });
      } else if (hook.platform === 'TELEGRAM') {
        const text = `<b>${payload.title}</b>\n${payload.description}\n\n${(payload.fields || [])
          .map((f) => `• <b>${f.name}:</b> ${f.value}`)
          .join('\n')}`;

        fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            parse_mode: 'HTML',
          }),
        }).catch((err) => {
          console.error(`[Webhook] Error sending to Telegram hook (${hook.id}):`, err);
        });
      }
    }
  } catch (err) {
    console.error('[Webhook] Failed to dispatch webhooks:', err);
  }
}
