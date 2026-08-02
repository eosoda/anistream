import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { KenjitsuProvider } from '@/lib/providers/kenjitsu.provider';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse || NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });

  try {
    const report = await new KenjitsuProvider().healthCheck();
    await prisma.providerHealthLog.create({
      data: {
        provider: report.providerId,
        status: report.status,
        latencyMs: report.latencyMs,
        error: report.errorMessage,
      },
    });
    return NextResponse.json({ reports: [report], source: 'kenjitsu' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao executar health check', message: error.message }, { status: 502 });
  }
}
