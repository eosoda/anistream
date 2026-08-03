import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getAdminHomepageState, HomepageConflictError, HomepageValidationError, publishHomepage } from '@/lib/homepage/repository';
import { recordAdminAudit } from '@/lib/admin/audit';

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const expectedDraftVersion = parseVersion(body?.expectedDraftVersion);
    const expectedPublishedVersion = parseVersion(body?.expectedPublishedVersion);
    if (!expectedDraftVersion || !expectedPublishedVersion) {
      return apiError('HOMEPAGE_INVALID_PUBLISH_REQUEST', 'As versões esperadas são obrigatórias.', 422);
    }

    const published = await publishHomepage({ expectedDraftVersion, expectedPublishedVersion, actorId: auth.userId });
    const state = await getAdminHomepageState();
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'homepage.published',
      resourceType: 'homepage',
      resourceId: 'main',
      summary: 'Nova composição da Home publicada.',
      metadata: {
        publishedVersion: published.publishedVersion,
        visibleBlockCount: state.summary.visibleBlockCount,
        blockTypes: state.summary.blockTypes,
      },
    });
    return apiSuccess(state);
  } catch (error) {
    if (error instanceof HomepageConflictError) {
      void recordAdminAudit({ actorId: auth.userId, action: 'homepage.conflict', resourceType: 'homepage', resourceId: 'main', summary: 'Conflito de versão ao publicar a Home.' });
      return apiError('HOMEPAGE_VERSION_CONFLICT', error.message, 409);
    }
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    return apiError('ADMIN_HOMEPAGE_PUBLISH_ERROR', error instanceof Error ? error.message : 'Não foi possível publicar a Home.', 500);
  }
}

