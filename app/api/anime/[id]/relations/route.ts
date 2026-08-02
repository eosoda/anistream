import { NextRequest, NextResponse } from 'next/server';
import { getAnimeRelations } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const relations = await getAnimeRelations(decodeURIComponent(id));
    return NextResponse.json({ relations });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json({ error: 'Não foi possível obter as relações pelo Kenjitsu.' }, { status });
  }
}
