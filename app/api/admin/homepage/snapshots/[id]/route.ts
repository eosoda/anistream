import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { getHomepageSnapshot, HomepageSnapshotNotFoundError, HomepageValidationError } from '@/lib/homepage/repository';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const { id } = await params;
    return apiSuccess(await getHomepageSnapshot(id), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
    });
  } catch (error) {
    if (error instanceof HomepageSnapshotNotFoundError) return apiError('HOMEPAGE_SNAPSHOT_NOT_FOUND', error.message, 404);
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    return apiError('ADMIN_HOMEPAGE_SNAPSHOT_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar o snapshot.', 500);
  }
}
