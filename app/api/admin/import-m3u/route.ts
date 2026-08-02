import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  return NextResponse.json({
    error: 'Importacao M3U foi desativada. Habilite e teste extensoes no painel Kenjitsu; as fontes sao live.',
  }, { status: 410 });
}
