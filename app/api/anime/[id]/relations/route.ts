import { NextRequest, NextResponse } from 'next/server';
import { getAnimeRelations } from '@/lib/kenjitsu/catalog';
import { KenjitsuRequestError } from '@/lib/kenjitsu/client';
import { checkDistributedRateLimit, getClientIp, rateLimitHeaders } from '@/lib/security/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rateLimit = await checkDistributedRateLimit(`anime-relations:${getClientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Muitas requisições de relações. Tente novamente mais tarde.' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  try {
    const relations = await getAnimeRelations(decodeURIComponent(id));
    return NextResponse.json({ relations }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    const status = error instanceof KenjitsuRequestError ? error.status : 502;
    return NextResponse.json({ error: 'Não foi possível obter as relações pelo Kenjitsu.' }, { status });
  }
}
