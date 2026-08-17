import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  getPublicExperienceAdminState,
  PublicExperienceConflictError,
  PublicExperienceValidationError,
  savePublicExperienceDraft,
} from '@/lib/public-experience/repository';
import { PublicExperienceSaveSchema, PublicExperienceConfigSchema } from '@/schemas/public-experience';

function validationDetails(error: unknown) {
  return error instanceof ZodError ? error.issues.map((issue) => ({ path: issue.path, message: issue.message })) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    return apiSuccess(await getPublicExperienceAdminState(), { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } });
  } catch (error) {
    console.error('[Admin Experience Fetch Error]', error);
    return apiError('ADMIN_EXPERIENCE_FETCH_ERROR', 'Não foi possível carregar a personalização.', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const input = PublicExperienceSaveSchema.parse(await request.json());
    const before = await getPublicExperienceAdminState();
    const result = await savePublicExperienceDraft({ ...input, actorId: auth.userId });
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'public_experience.draft_updated',
      resourceType: 'public_experience',
      resourceId: 'main',
      summary: 'Rascunho de personalização pública atualizado.',
      metadata: { beforeRevision: before.draftVersion, revision: result.state.draftVersion },
    });
    return apiSuccess(result.state);
  } catch (error) {
    if (error instanceof PublicExperienceConflictError) return apiError('PUBLIC_EXPERIENCE_VERSION_CONFLICT', error.message, 409);
    if (error instanceof PublicExperienceValidationError || error instanceof ZodError)
      return apiError('PUBLIC_EXPERIENCE_INVALID', 'Revise os campos destacados antes de salvar.', 422, validationDetails(error));
    console.error('[Admin Experience Save Error]', error);
    return apiError('ADMIN_EXPERIENCE_SAVE_ERROR', 'Não foi possível salvar a personalização.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const result = PublicExperienceConfigSchema.safeParse(body?.config);
    if (!result.success) return apiError('PUBLIC_EXPERIENCE_INVALID', 'A configuração enviada é inválida.', 422, validationDetails(result.error));
    return apiSuccess({ valid: true, config: result.data });
  } catch (error) {
    console.error('[Admin Experience Validate Error]', error);
    return apiError('ADMIN_EXPERIENCE_VALIDATE_ERROR', 'Não foi possível validar a configuração.', 500);
  }
}
