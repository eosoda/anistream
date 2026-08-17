import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  return NextResponse.json(
    { error: 'Endpoint legado desativado. Use o assistente seguro em /setup.' },
    { status: 410 },
  );
}
