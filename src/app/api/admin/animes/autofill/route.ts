import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { normalizeAnimeTitle } from '@/lib/anime/normalize-title';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title || !title.trim()) {
    return NextResponse.json(
      { error: 'Título para busca é obrigatório' },
      { status: 400 }
    );
  }

  try {
    const jikanUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(
      title.trim()
    )}&limit=5`;

    const res = await fetch(jikanUrl, {
      headers: {
        'User-Agent': 'AniStream-AdminAutofill/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao consultar API Jikan (HTTP ${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items = data.data || [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum anime encontrado no MyAnimeList/Jikan' },
        { status: 404 }
      );
    }

    const results = items.map((item: any) => ({
      malId: item.mal_id,
      title: item.title_english || item.title,
      originalTitle: item.title_japanese || item.title,
      normalizedTitle: normalizeAnimeTitle(item.title_english || item.title),
      slug: (item.title_english || item.title)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-'),
      posterUrl:
        item.images?.jpg?.large_image_url ||
        item.images?.jpg?.image_url ||
        null,
      bannerUrl: item.images?.jpg?.large_image_url || null,
      releaseYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : null),
      status: item.status === 'Currently Airing' ? 'Em Lançamento' : item.status === 'Finished Airing' ? 'Concluído' : item.status,
      description: item.synopsis || null,
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao buscar metadados automáticos', message: err.message },
      { status: 500 }
    );
  }
}
