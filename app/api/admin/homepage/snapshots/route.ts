import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  createHomepageDraftSnapshot,
  getAdminHomepageState,
  HomepageConflictError,
  HomepageValidationError,
  listHomepageSnapshots,
} from '@/lib/homepage/repository';

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    return apiSuccess(await listHomepageSnapshots(), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
    });
  } catch (error) {
    return apiError('ADMIN_HOMEPAGE_SNAPSHOTS_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar os snapshots da Home.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const expectedDraftVersion = parseVersion(body?.expectedDraftVersion);
    if (!expectedDraftVersion) return apiError('HOMEPAGE_INVALID_SNAPSHOT_REQUEST', 'A versão esperada do rascunho é obrigatória.', 422);
    if (body?.label !== undefined && body.label !== null && typeof body.label !== 'string') {
      return apiError('HOMEPAGE_INVALID_SNAPSHOT_LABEL', 'O nome do snapshot precisa ser um texto.', 422);
    }

    const snapshot = await createHomepageDraftSnapshot({
      expectedDraftVersion,
      actorId: auth.userId,
      label: body.label,
    });
    const state = await getAdminHomepageState();
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'homepage.snapshot.created',
      resourceType: 'homepage_snapshot',
      resourceId: snapshot.id,
      summary: `Snapshot “${snapshot.label}” criado para o rascunho da Home.`,
      metadata: { version: snapshot.version, kind: snapshot.kind },
    });
    return apiSuccess({ snapshot: state.snapshots.find((item) => item.id === snapshot.id) || null, state });
  } catch (error) {
    if (error instanceof HomepageConflictError) return apiError('HOMEPAGE_VERSION_CONFLICT', error.message, 409);
    if (error instanceof HomepageValidationError) return apiError('HOMEPAGE_INVALID_DOCUMENT', error.message, 422);
    return apiError('ADMIN_HOMEPAGE_SNAPSHOT_CREATE_ERROR', error instanceof Error ? error.message : 'Não foi possível criar o snapshot.', 500);
  }
}
