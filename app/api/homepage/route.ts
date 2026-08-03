import { apiError, apiSuccess } from '@/lib/api/response';
import { getPublishedHomepageDocument } from '@/lib/homepage/repository';
import { resolveHomepageDocument } from '@/lib/homepage/resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const published = await getPublishedHomepageDocument();
    const resolved = await resolveHomepageDocument(published.document);
    return apiSuccess(
      {
        ...resolved,
        source: published.source,
        publishedVersion: published.publishedVersion,
        publishedAt: published.publishedAt,
        publishedBy: published.publishedBy,
      },
      {
        headers: {
          'Cache-Control': published.source === 'emergency'
            ? 'no-store'
            : 'public, s-maxage=300, stale-while-revalidate=1800',
        },
      },
    );
  } catch (error) {
    return apiError('HOMEPAGE_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar a Home.', 502);
  }
}

