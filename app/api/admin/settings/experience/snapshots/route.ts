import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { createPublicExperienceSnapshot, getPublicExperienceAdminState, PublicExperienceConflictError } from '@/lib/public-experience/repository';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const state = await getPublicExperienceAdminState();
    return apiSuccess(state.snapshots, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    console.error('[Admin Experience Snapshot Fetch Error]', error);
    return apiError('ADMIN_EXPERIENCE_SNAPSHOT_FETCH_ERROR', 'Não foi possível carregar o histórico.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const body = await request.json();
    if (!Number.isInteger(body?.expectedDraftVersion)) return apiError('PUBLIC_EXPERIENCE_INVALID_SNAPSHOT', 'A versão do rascunho é obrigatória.', 422);
    const snapshot = await createPublicExperienceSnapshot({ expectedDraftVersion: body.expectedDraftVersion, label: body.label, actorId: auth.userId });
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'public_experience.snapshot_created',
      resourceType: 'public_experience_snapshot',
      resourceId: snapshot.id,
      summary: 'Snapshot da personalização pública criado.',
    });
    return apiSuccess(await getPublicExperienceAdminState(), { status: 201 });
  } catch (error) {
    if (error instanceof PublicExperienceConflictError) return apiError('PUBLIC_EXPERIENCE_VERSION_CONFLICT', error.message, 409);
    console.error('[Admin Experience Snapshot Create Error]', error);
    return apiError('ADMIN_EXPERIENCE_SNAPSHOT_CREATE_ERROR', 'Não foi possível criar o snapshot.', 500);
  }
}
