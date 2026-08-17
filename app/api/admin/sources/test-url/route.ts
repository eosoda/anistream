import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  return NextResponse.json(
    { error: 'Teste manual de URLs foi desativado. Use o painel de extensões Kenjitsu.' },
    { status: 410 },
  );
}
