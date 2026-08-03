import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { getAdminHomepageState } from '@/lib/homepage/repository';
import { homepageSectionSummary } from '@/lib/homepage/defaults';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['public_navigation', 'page_features'] },
      },
    });

    const settingsMap = new Map<string, unknown>();
    for (const item of settingsList) {
      try {
        settingsMap.set(item.key, JSON.parse(item.value));
      } catch {
        settingsMap.set(item.key, null);
      }
    }

    const homepage = await getAdminHomepageState();
    return apiSuccess({
      navigation: Array.isArray(settingsMap.get('public_navigation')) ? settingsMap.get('public_navigation') : null,
      pages: Array.isArray(settingsMap.get('page_features')) ? settingsMap.get('page_features') : null,
      homeSections: homepageSectionSummary(homepage.published),
      homepageSummary: homepage.summary,
    });
  } catch (error) {
    return apiError('ADMIN_NAVIGATION_FETCH_ERROR', error instanceof Error ? error.message : 'Não foi possível carregar a navegação.', 500);
  }
}
export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = await request.json();
    const { navigation, pages } = body;
    const updates: Promise<unknown>[] = [];

    if (Array.isArray(navigation)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'public_navigation' },
          update: { value: JSON.stringify(navigation) },
          create: { key: 'public_navigation', value: JSON.stringify(navigation) },
        }),
      );
    }

    if (Array.isArray(pages)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'page_features' },
          update: { value: JSON.stringify(pages) },
          create: { key: 'page_features', value: JSON.stringify(pages) },
        }),
      );
    }

    await Promise.all(updates);
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'navigation.updated',
      resourceType: 'navigation',
      summary: 'Configurações públicas de navegação atualizadas.',
      metadata: {
        navigationCount: Array.isArray(navigation) ? navigation.length : 0,
        pageCount: Array.isArray(pages) ? pages.length : 0,
      },
    });

    return apiSuccess({ message: 'Configurações de navegação e páginas salvas com sucesso.' });
  } catch (error) {
    return apiError('ADMIN_NAVIGATION_SAVE_ERROR', error instanceof Error ? error.message : 'Não foi possível salvar a navegação.', 500);
  }
}
