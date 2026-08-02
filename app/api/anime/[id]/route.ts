import { NextRequest, NextResponse } from 'next/server';
import { getAnimeCatalog } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const anime = await getAnimeCatalog(decodeURIComponent(id));
    return NextResponse.json({ anime }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json(
      { error: 'Não foi possível obter os detalhes pelo Kenjitsu.' },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
