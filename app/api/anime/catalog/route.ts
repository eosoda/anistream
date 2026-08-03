import { NextRequest, NextResponse } from 'next/server';
import { getSeasonAnime, getTopAnime } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get('kind') || 'popular';
  const page = Number(request.nextUrl.searchParams.get('page') || '1');
  const limit = Number(request.nextUrl.searchParams.get('limit') || '24');

  try {
    if (kind === 'season') {
      const year = Number(request.nextUrl.searchParams.get('year'));
      const season = request.nextUrl.searchParams.get('season') as 'winter' | 'spring' | 'summer' | 'fall' | null;
      if (!Number.isInteger(year) || !season || !['winter', 'spring', 'summer', 'fall'].includes(season)) {
        return NextResponse.json({ error: 'Parâmetros de temporada inválidos.' }, { status: 400 });
      }
      return NextResponse.json(await getSeasonAnime(year, season, page, limit), { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    const category = kind === 'airing' || kind === 'upcoming' || kind === 'rating' || kind === 'trending' ? kind : 'popular';
    return NextResponse.json(await getTopAnime(category, page, limit), { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json(
      { error: 'Não foi possível carregar o catálogo pelo Kenjitsu.' },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
