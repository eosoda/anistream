import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { createEditorialCollection, listEditorialCollections } from '@/lib/editorial-collections/repository';
import { EditorialCollectionCreateSchema } from '@/schemas/editorial-collection';

function validationDetails(error: unknown) {
  return error instanceof ZodError ? error.issues.map((issue) => ({ path: issue.path, message: issue.message })) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    return apiSuccess(await listEditorialCollections(), { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } });
  } catch (error) {
    console.error('[Admin Collections Fetch Error]', error);
    return apiError('ADMIN_COLLECTIONS_FETCH_ERROR', 'Não foi possível carregar as coleções.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const input = EditorialCollectionCreateSchema.parse(await request.json());
    const collection = await createEditorialCollection(input);
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'collection.created',
      resourceType: 'editorial_collection',
      resourceId: collection.id,
      summary: `Coleção “${collection.title}” criada.`,
      metadata: { slug: collection.slug, itemCount: collection.items.length },
    });
    return apiSuccess(collection, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return apiError('COLLECTION_INVALID', 'Revise os campos da coleção.', 422, validationDetails(error));
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return apiError('COLLECTION_SLUG_EXISTS', 'Já existe uma coleção com esse slug.', 409);
    console.error('[Admin Collection Create Error]', error);
    return apiError('ADMIN_COLLECTION_CREATE_ERROR', 'Não foi possível criar a coleção.', 500);
  }
}
