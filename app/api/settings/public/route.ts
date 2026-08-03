import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess } from '@/lib/api/response';
import type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';
import { DEFAULT_HOMEPAGE_DOCUMENT, homepageSectionSummary } from '@/lib/homepage/defaults';
import { getPublishedHomepageDocument } from '@/lib/homepage/repository';

export type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';

const DEFAULT_NAVIGATION: NavItemConfig[] = [
  { id: 'home', label: 'Início', href: '/', enabled: true, order: 1 },
  { id: 'popular', label: 'Populares', href: '/populares', enabled: true, order: 2 },
  { id: 'movies', label: 'Filmes', href: '/filmes', enabled: true, order: 3 },
  { id: 'seasons', label: 'Temporadas', href: '/temporadas', enabled: true, order: 4 },
  { id: 'calendar', label: 'Calendário', href: '/calendario', enabled: true, order: 5 },
];

const DEFAULT_PAGES: PageFeatureConfig[] = [
  {
    id: 'movies',
    name: 'Página de Filmes',
    href: '/filmes',
    enabled: true,
    disabledMessage: 'A seção de Filmes de Anime está em manutenção temporária para inclusão de novos títulos.',
  },
  {
    id: 'seasons',
    name: 'Página de Temporadas',
    href: '/temporadas',
    enabled: true,
    disabledMessage: 'A programação de temporadas está sendo atualizada com a nova grade do Japão.',
  },
  {
    id: 'calendar',
    name: 'Página de Calendário',
    href: '/calendario',
    enabled: true,
    disabledMessage: 'O calendário semanal de lançamentos voltará a ser exibido em breve.',
  },
];

const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = homepageSectionSummary(DEFAULT_HOMEPAGE_DOCUMENT);

export async function GET(_request: NextRequest) {
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

    const navigation: NavItemConfig[] = Array.isArray(settingsMap.get('public_navigation'))
      ? settingsMap.get('public_navigation') as NavItemConfig[]
      : DEFAULT_NAVIGATION;
    const pages: PageFeatureConfig[] = Array.isArray(settingsMap.get('page_features'))
      ? settingsMap.get('page_features') as PageFeatureConfig[]
      : DEFAULT_PAGES;
    const publishedHomepage = await getPublishedHomepageDocument();
    const homeSections: HomeSectionConfig[] = homepageSectionSummary(publishedHomepage.document);

    return apiSuccess(
      {
        navigation: navigation.slice().sort((a, b) => a.order - b.order),
        pages,
        homeSections,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
        },
      },
    );
  } catch {
    return apiSuccess({
      navigation: DEFAULT_NAVIGATION,
      pages: DEFAULT_PAGES,
      homeSections: DEFAULT_HOME_SECTIONS,
    });
  }
}
