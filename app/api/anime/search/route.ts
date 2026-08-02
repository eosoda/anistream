import { NextRequest, NextResponse } from 'next/server';
import { searchAnimeCatalog } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const reqPath = request.nextUrl.pathname;
  const rateLimit = checkRateLimit(request, 'search', { limit: 60, windowMs: 60000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Muitas requisições de pesquisa. Tente novamente mais tarde.' }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  const page = Number(request.nextUrl.searchParams.get('page') || '1');
  const limit = Number(request.nextUrl.searchParams.get('limit') || '24');

  if (page < 1 || limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'Parâmetros de busca inválidos.' }, { status: 400 });
  }

  try {
    const result = await searchAnimeCatalog(query, page, limit);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    console.error(`[${reqPath}] Kenjitsu catalog search failed`, error);
    return NextResponse.json(
      { error: 'Não foi possível consultar o catálogo do Kenjitsu.' },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
