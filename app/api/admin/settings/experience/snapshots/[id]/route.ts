import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getPublicExperienceSnapshot, PublicExperienceSnapshotNotFoundError } from '@/lib/public-experience/repository';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    return apiSuccess(await getPublicExperienceSnapshot((await params).id), { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    if (error instanceof PublicExperienceSnapshotNotFoundError) return apiError('PUBLIC_EXPERIENCE_SNAPSHOT_NOT_FOUND', error.message, 404);
    console.error('[Admin Experience Snapshot Detail Error]', error);
    return apiError('ADMIN_EXPERIENCE_SNAPSHOT_DETAIL_ERROR', 'Não foi possível carregar o snapshot.', 500);
  }
}
