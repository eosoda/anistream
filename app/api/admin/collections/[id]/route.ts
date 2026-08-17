import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { deleteEditorialCollection, getEditorialCollectionById, updateEditorialCollection } from '@/lib/editorial-collections/repository';
import { EditorialCollectionUpdateSchema } from '@/schemas/editorial-collection';

function validationDetails(error: unknown) {
  return error instanceof ZodError ? error.issues.map((issue) => ({ path: issue.path, message: issue.message })) : undefined;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { id } = await params;
  const collection = await getEditorialCollectionById(id);
  if (!collection) return apiError('COLLECTION_NOT_FOUND', 'Coleção não encontrada.', 404);
  return apiSuccess(collection, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { id } = await params;

  try {
    const input = EditorialCollectionUpdateSchema.parse(await request.json());
    const collection = await updateEditorialCollection(id, input);
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'collection.updated',
      resourceType: 'editorial_collection',
      resourceId: id,
      summary: `Coleção “${collection.title}” atualizada.`,
      metadata: { slug: collection.slug, itemCount: collection.items.length },
    });
    return apiSuccess(collection);
  } catch (error) {
    if (error instanceof ZodError) return apiError('COLLECTION_INVALID', 'Revise os campos da coleção.', 422, validationDetails(error));
    if (error instanceof Error && error.message === 'Coleção não encontrada.') return apiError('COLLECTION_NOT_FOUND', error.message, 404);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return apiError('COLLECTION_SLUG_EXISTS', 'Já existe uma coleção com esse slug.', 409);
    console.error('[Admin Collection Update Error]', error);
    return apiError('ADMIN_COLLECTION_UPDATE_ERROR', 'Não foi possível atualizar a coleção.', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  const { id } = await params;

  try {
    await deleteEditorialCollection(id);
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'collection.deleted',
      resourceType: 'editorial_collection',
      resourceId: id,
      summary: 'Coleção editorial excluída.',
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')
      return apiError('COLLECTION_NOT_FOUND', 'Coleção não encontrada.', 404);
    console.error('[Admin Collection Delete Error]', error);
    return apiError('ADMIN_COLLECTION_DELETE_ERROR', 'Não foi possível excluir a coleção.', 500);
  }
}
