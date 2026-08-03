import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getAdminHomepageState, HomepageConflictError, HomepageValidationError, saveHomepageDraft } from '@/lib/homepage/repository';
import { recordAdminAudit } from '@/lib/admin/audit';

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    return apiSuccess(await getAdminHomepageState(), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
    });
  } catch (error) {
    return apiError('ADMIN_HOMEPAGE_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar o builder.', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const expectedDraftVersion = parseVersion(body?.expectedDraftVersion);
    if (!expectedDraftVersion || !body?.document) {
      return apiError('HOMEPAGE_INVALID_DRAFT_REQUEST', 'Documento e versão esperada são obrigatórios.', 422);
    }

    const result = await saveHomepageDraft({
      document: body.document,
      expectedDraftVersion,
      actorId: auth.userId,
    });

    return apiSuccess(result.state, { status: 200 });
  } catch (error) {
    if (error instanceof HomepageConflictError) {
      void recordAdminAudit({
        actorId: auth.userId,
        action: 'homepage.conflict',
        resourceType: 'homepage',
        resourceId: 'main',
        summary: 'Conflito de versão ao salvar o rascunho da Home.',
      });
      return apiError('HOMEPAGE_VERSION_CONFLICT', error.message, 409);
    }
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    return apiError('ADMIN_HOMEPAGE_SAVE_ERROR', error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.', 500);
  }
}

