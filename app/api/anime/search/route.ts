import { NextRequest, NextResponse } from 'next/server';
import { AnimeSearchInputSchema } from '@/schemas/anime';
import { LocalDatabaseProvider } from '@/lib/providers/local-database.provider';
import { checkRateLimit } from '@/lib/security/rate-limit';

const localProvider = new LocalDatabaseProvider();

export async function GET(request: NextRequest) {
  // 1. Rate Limit Check
  const rateLimit = checkRateLimit(request, 'search', {
    limit: 40,
    windowMs: 60000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429 }
    );
  }

  // 2. Parâmetros da Query String
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limitStr = searchParams.get('limit') || '20';

  const parseResult = AnimeSearchInputSchema.safeParse({
    query: q,
    limit: parseInt(limitStr, 10),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Parâmetros de busca inválidos', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { query, limit } = parseResult.data;

  try {
    const results = await localProvider.searchAnime({ query, limit });
    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao processar busca', message: err.message },
      { status: 500 }
    );
  }
}
