import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { invalidatePublicExperienceCache } from '@/lib/public-experience/repository';

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;
  try {
    await invalidatePublicExperienceCache();
    await recordAdminAudit({
      actorId: auth.userId,
      action: 'public_experience.cache_invalidated',
      resourceType: 'public_experience',
      resourceId: 'main',
      summary: 'Cache da personalização pública invalidado.',
    });
    return apiSuccess({ invalidated: true });
  } catch (error) {
    console.error('[Admin Experience Invalidate Error]', error);
    return apiError('ADMIN_EXPERIENCE_INVALIDATE_ERROR', 'Não foi possível invalidar o cache.', 500);
  }
}
