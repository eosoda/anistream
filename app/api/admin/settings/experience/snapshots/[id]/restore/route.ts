import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  getPublicExperienceAdminState,
  PublicExperienceConflictError,
  PublicExperienceSnapshotNotFoundError,
  restorePublicExperienceSnapshot,
} from '@/lib/public-experience/repository';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const body = await request.json();
    if (!Number.isInteger(body?.expectedDraftVersion)) return apiError('PUBLIC_EXPERIENCE_INVALID_RESTORE', 'A versão do rascunho é obrigatória.', 422);
    const id = (await params).id;
    await restorePublicExperienceSnapshot({ id, expectedDraftVersion: body.expectedDraftVersion, actorId: auth.userId });
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'public_experience.snapshot_restored',
      resourceType: 'public_experience_snapshot',
      resourceId: id,
      summary: 'Snapshot restaurado no rascunho da personalização pública.',
    });
    return apiSuccess(await getPublicExperienceAdminState());
  } catch (error) {
    if (error instanceof PublicExperienceSnapshotNotFoundError) return apiError('PUBLIC_EXPERIENCE_SNAPSHOT_NOT_FOUND', error.message, 404);
    if (error instanceof PublicExperienceConflictError) return apiError('PUBLIC_EXPERIENCE_VERSION_CONFLICT', error.message, 409);
    console.error('[Admin Experience Snapshot Restore Error]', error);
    return apiError('ADMIN_EXPERIENCE_SNAPSHOT_RESTORE_ERROR', 'Não foi possível restaurar o snapshot.', 500);
  }
}
