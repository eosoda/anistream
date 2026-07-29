import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });

    if (!setting) {
      return NextResponse.json({ maintenance: false });
    }

    const data = JSON.parse(setting.value);
    return NextResponse.json({
      maintenance: Boolean(data.enabled),
      message: data.message || 'Estamos em manutenção programada. Voltaremos em breve!',
      estimatedEnd: data.estimatedEnd || null,
    });
  } catch (err) {
    return NextResponse.json({ maintenance: false });
  }
}
