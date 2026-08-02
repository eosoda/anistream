import { NextRequest, NextResponse } from 'next/server';
import { getAnimeEpisodes } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const season = Number(request.nextUrl.searchParams.get('season') || '1');

  if (!Number.isInteger(season) || season < 1) {
    return NextResponse.json({ error: 'Temporada inválida.' }, { status: 400 });
  }

  try {
    const episodes = await getAnimeEpisodes(decodeURIComponent(id));
    return NextResponse.json({ season, episodes }, { headers: { 'Cache-Control': 'private, max-age=120' } });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json(
      { error: 'Não foi possível obter os episódios pelo Kenjitsu.' },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
