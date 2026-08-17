import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getPublishedEditorialCollection } from '@/lib/editorial-collections/repository';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return apiError('COLLECTION_INVALID_SLUG', 'Coleção não encontrada.', 404);

  try {
    const collection = await getPublishedEditorialCollection(slug);
    if (!collection) return apiError('COLLECTION_NOT_FOUND', 'Coleção não encontrada.', 404);
    return apiSuccess(collection, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('[Public Collection Fetch Error]', error);
    return apiError('COLLECTION_FETCH_ERROR', 'Não foi possível carregar a coleção.', 503);
  }
}
