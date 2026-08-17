import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { warmEpisodeCacheById } from '@/lib/streams/cache-warm';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; epId: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { epId } = await context.params;

  try {
    const cache = await warmEpisodeCacheById(epId, { audioMode: 'sub' });
    if (!cache) return NextResponse.json({ error: 'Episódio não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true, cache });
  } catch (error) {
    console.error('[Admin Discover Sources Error]', error);
    return NextResponse.json(
      { error: 'Não foi possível consultar mídias nas extensões Kenjitsu.' },
      { status: 500 }
    );
  }
}
