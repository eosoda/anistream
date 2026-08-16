import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { apiError, apiSuccess } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import {
  NavigationConflictError,
  getNavigationConfiguration,
  saveNavigationConfiguration,
} from '@/lib/navigation/repository';
import { buildNavigationPreview } from '@/lib/navigation/presentation';
import { parseNavigationSave } from '@/schemas/navigation';

function validationDetails(error: unknown) {
  return error instanceof ZodError
    ? error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
    : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const config = await getNavigationConfiguration();
    return apiSuccess({ ...config, preview: buildNavigationPreview(config) });
  } catch (error) {
    console.error('[Admin Navigation Fetch Error]', error);
    return apiError('ADMIN_NAVIGATION_FETCH_ERROR', 'Não foi possível carregar a navegação.', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const input = parseNavigationSave(await request.json());
    const before = await getNavigationConfiguration();
    const saved = await saveNavigationConfiguration(input);

    await recordAdminAudit({
      actorId: auth.userId,
      action: 'navigation.updated',
      resourceType: 'navigation',
      resourceId: 'public-experience',
      summary: 'Configuração pública de navegação atualizada.',
      metadata: {
        beforeRevision: before.revision,
        revision: saved.revision,
        enabledNavigationCount: saved.navigation.filter((item) => item.enabled).length,
        mobileBottomIds: saved.mobileBottomIds,
        disabledPages: saved.pages.filter((page) => !page.enabled).map((page) => page.id),
      },
    });

    return apiSuccess({ ...saved, preview: buildNavigationPreview(saved) });
  } catch (error) {
    if (error instanceof NavigationConflictError) return apiError('NAVIGATION_VERSION_CONFLICT', error.message, 409);
    if (error instanceof ZodError) return apiError('NAVIGATION_INVALID', 'Revise os campos destacados antes de publicar.', 422, validationDetails(error));
    console.error('[Admin Navigation Save Error]', error);
    return apiError('ADMIN_NAVIGATION_SAVE_ERROR', 'Não foi possível salvar a navegação.', 500);
  }
}
