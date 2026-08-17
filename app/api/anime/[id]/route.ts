import { NextRequest, NextResponse } from 'next/server';
import { getAnimeCatalog } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rateLimit = await checkDistributedRateLimit(`anime-detail:${getClientIp(request)}`, { limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Muitas requisições de detalhes. Tente novamente mais tarde.' }, { status: 429, headers: rateLimitHeaders(rateLimit) });

  try {
    const anime = await getAnimeCatalog(decodeURIComponent(id));
    return NextResponse.json({ anime }, { headers: { 'Cache-Control': 'private, max-age=300', ...rateLimitHeaders(rateLimit) } });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json(
      { error: 'Não foi possível obter os detalhes pelo Kenjitsu.' },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
