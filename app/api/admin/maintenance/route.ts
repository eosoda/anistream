import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { enabled, message, estimatedEnd } = body;

    const valueStr = JSON.stringify({
      enabled: Boolean(enabled),
      message: message || 'Estamos em manutenção programada para atualização de servidores.',
      estimatedEnd: estimatedEnd || null,
      updatedAt: new Date().toISOString(),
    });

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: valueStr },
      create: { key: 'maintenance_mode', value: valueStr },
    });

    return NextResponse.json({ success: true, setting: JSON.parse(setting.value) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
