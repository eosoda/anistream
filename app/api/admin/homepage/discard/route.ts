import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { discardHomepageDraft, getAdminHomepageState, HomepageConflictError } from '@/lib/homepage/repository';
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
      return apiError('HOMEPAGE_INVALID_DISCARD_REQUEST', 'As versões esperadas são obrigatórias.', 422);
    }

    await discardHomepageDraft({ expectedDraftVersion, expectedPublishedVersion, actorId: auth.userId });
    const state = await getAdminHomepageState();
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'homepage.draft.discarded',
      resourceType: 'homepage',
      resourceId: 'main',
      summary: 'Rascunho da Home descartado e restaurado para a última publicação.',
    });
    return apiSuccess(state);
  } catch (error) {
    if (error instanceof HomepageConflictError) {
      void recordAdminAudit({ actorId: auth.userId, action: 'homepage.conflict', resourceType: 'homepage', resourceId: 'main', summary: 'Conflito de versão ao descartar o rascunho da Home.' });
      return apiError('HOMEPAGE_VERSION_CONFLICT', error.message, 409);
    }
    return apiError('ADMIN_HOMEPAGE_DISCARD_ERROR', error instanceof Error ? error.message : 'Não foi possível descartar o rascunho.', 500);
  }
}

