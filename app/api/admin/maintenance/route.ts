import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.errorResponse!;
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

    void recordAdminAudit({ actorId: auth.userId, action: enabled ? 'maintenance.enabled' : 'maintenance.disabled', resourceType: 'maintenance', summary: enabled ? 'Modo manutenção ativado.' : 'Modo manutenção desativado.', metadata: { enabled: Boolean(enabled), estimatedEnd: estimatedEnd || null } });

    return NextResponse.json({ success: true, setting: JSON.parse(setting.value) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
