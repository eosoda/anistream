import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const settingsList = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['public_navigation', 'page_features', 'home_sections'] },
      },
    });

    const settingsMap = new Map<string, any>();
    for (const item of settingsList) {
      try {
        settingsMap.set(item.key, JSON.parse(item.value));
      } catch {
        settingsMap.set(item.key, null);
      }
    }

    return apiSuccess({
      navigation: settingsMap.get('public_navigation') || null,
      pages: settingsMap.get('page_features') || null,
      homeSections: settingsMap.get('home_sections') || null,
    });
  } catch (err: any) {
    return apiError('ADMIN_NAVIGATION_FETCH_ERROR', err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { navigation, pages, homeSections } = body;

    const updates: Promise<any>[] = [];

    if (navigation && Array.isArray(navigation)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'public_navigation' },
          update: { value: JSON.stringify(navigation) },
          create: { key: 'public_navigation', value: JSON.stringify(navigation) },
        })
      );
    }

    if (pages && Array.isArray(pages)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'page_features' },
          update: { value: JSON.stringify(pages) },
          create: { key: 'page_features', value: JSON.stringify(pages) },
        })
      );
    }

    if (homeSections && Array.isArray(homeSections)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'home_sections' },
          update: { value: JSON.stringify(homeSections) },
          create: { key: 'home_sections', value: JSON.stringify(homeSections) },
        })
      );
    }

    await Promise.all(updates);

    return apiSuccess({
      message: 'Configurações de navegação e páginas salvas com sucesso no banco de dados!',
    });
  } catch (err: any) {
    return apiError('ADMIN_NAVIGATION_SAVE_ERROR', err.message, 500);
  }
}
