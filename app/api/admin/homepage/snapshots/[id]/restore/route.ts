import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  getAdminHomepageState,
  HomepageConflictError,
  HomepageSnapshotNotFoundError,
  HomepageValidationError,
  restoreHomepageSnapshot,
} from '@/lib/homepage/repository';

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const { id } = await params;
    const body = await request.json();
    const expectedDraftVersion = parseVersion(body?.expectedDraftVersion);
    if (!expectedDraftVersion) return apiError('HOMEPAGE_INVALID_RESTORE_REQUEST', 'A versão esperada do rascunho é obrigatória.', 422);

    await restoreHomepageSnapshot({ id, expectedDraftVersion, actorId: auth.userId });
    const state = await getAdminHomepageState();
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'homepage.snapshot.restored',
      resourceType: 'homepage_snapshot',
      resourceId: id,
      summary: 'Snapshot da Home restaurado para o rascunho.',
      metadata: { draftVersion: state.draftVersion, publishedVersion: state.publishedVersion },
    });
    return apiSuccess(state);
  } catch (error) {
    if (error instanceof HomepageSnapshotNotFoundError) return apiError('HOMEPAGE_SNAPSHOT_NOT_FOUND', error.message, 404);
    if (error instanceof HomepageConflictError) return apiError('HOMEPAGE_VERSION_CONFLICT', error.message, 409);
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    return apiError('ADMIN_HOMEPAGE_SNAPSHOT_RESTORE_ERROR', error instanceof Error ? error.message : 'Não foi possível restaurar o snapshot.', 500);
  }
}
