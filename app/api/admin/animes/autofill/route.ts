import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { searchAnimeMetadata } from '@/lib/anime/metadata-fetcher';

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
    const results = await searchAnimeMetadata(title.trim());

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum anime encontrado no catalogo do Kenjitsu' },
        { status: 404 }
      );
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao buscar metadados automáticos', message: err.message },
      { status: 500 }
    );
  }
}
