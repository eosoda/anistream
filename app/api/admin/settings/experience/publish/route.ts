import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  getPublicExperienceAdminState,
  publishPublicExperience,
  PublicExperienceConflictError,
  PublicExperienceValidationError,
} from '@/lib/public-experience/repository';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    const body = await request.json();
    const expectedDraftVersion = body?.expectedDraftVersion;
    const expectedPublishedVersion = body?.expectedPublishedVersion;
    if (!Number.isInteger(expectedDraftVersion) || !Number.isInteger(expectedPublishedVersion))
      return apiError('PUBLIC_EXPERIENCE_INVALID_PUBLISH', 'As versões esperadas são obrigatórias.', 422);
    const published = await publishPublicExperience({ expectedDraftVersion, expectedPublishedVersion, actorId: auth.userId });
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'public_experience.published',
      resourceType: 'public_experience',
      resourceId: 'main',
      summary: 'Personalização pública publicada.',
      metadata: { version: published.publishedVersion },
    });
    return apiSuccess(await getPublicExperienceAdminState());
  } catch (error) {
    if (error instanceof PublicExperienceConflictError) return apiError('PUBLIC_EXPERIENCE_VERSION_CONFLICT', error.message, 409);
    if (error instanceof PublicExperienceValidationError) return apiError('PUBLIC_EXPERIENCE_INVALID', error.message, 422);
    console.error('[Admin Experience Publish Error]', error);
    return apiError('ADMIN_EXPERIENCE_PUBLISH_ERROR', 'Não foi possível publicar a personalização.', 500);
  }
}
