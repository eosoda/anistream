import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { deleteHomepageSnapshot, getHomepageSnapshot, HomepageSnapshotNotFoundError, HomepageSnapshotProtectedError, HomepageValidationError } from '@/lib/homepage/repository';
import { recordAdminAudit } from '@/lib/admin/audit';

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
    console.error('[Admin Homepage Snapshot Fetch Error]', error);
    return apiError('ADMIN_HOMEPAGE_SNAPSHOT_FETCH_ERROR', 'Não foi possível carregar o snapshot.', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const { id } = await params;
    const snapshot = await deleteHomepageSnapshot(id);
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'homepage.snapshot.deleted',
      resourceType: 'homepage_snapshot',
      resourceId: snapshot.id,
      summary: `Snapshot “${snapshot.label}” excluído do histórico da Home.`,
      metadata: { version: snapshot.version, kind: snapshot.kind },
    });
    return apiSuccess({ snapshot });
  } catch (error) {
    if (error instanceof HomepageSnapshotNotFoundError) return apiError('HOMEPAGE_SNAPSHOT_NOT_FOUND', error.message, 404);
    if (error instanceof HomepageSnapshotProtectedError) return apiError('HOMEPAGE_SNAPSHOT_PROTECTED', error.message, 409);
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    console.error('[Admin Homepage Snapshot Delete Error]', error);
    return apiError('ADMIN_HOMEPAGE_SNAPSHOT_DELETE_ERROR', 'Não foi possível excluir o snapshot.', 500);
  }
}
