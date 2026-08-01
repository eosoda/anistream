import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuccess } from '@/lib/api/response';
import type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';

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

const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { id: 'hero', name: 'Banner Hero (Destaques)', enabled: true, order: 1 },
  { id: 'quick_filter', name: 'Filtros Rápidos (Multi-Filter)', enabled: true, order: 2 },
  { id: 'continue_watching', name: 'Continuar Assistindo', enabled: true, order: 3 },
  { id: 'trending', name: 'Em Alta', enabled: true, order: 4 },
  { id: 'season_now', name: 'Temporada Atual', enabled: true, order: 5 },
  { id: 'top_popular', name: 'Mais Populares', enabled: true, order: 6 },
  { id: 'top_rated', name: 'Mais Bem Avaliados', enabled: true, order: 7 },
];
const HOME_SECTION_IDS = new Set(DEFAULT_HOME_SECTIONS.map((section) => section.id));

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

    const navigation: NavItemConfig[] = settingsMap.get('public_navigation') || DEFAULT_NAVIGATION;
    const pages: PageFeatureConfig[] = settingsMap.get('page_features') || DEFAULT_PAGES;
    const storedHomeSections = settingsMap.get('home_sections');
    const homeSections: HomeSectionConfig[] = Array.isArray(storedHomeSections)
      ? storedHomeSections.filter((section) => HOME_SECTION_IDS.has(section.id))
      : DEFAULT_HOME_SECTIONS;

    return apiSuccess(
      {
        navigation: navigation.sort((a, b) => a.order - b.order),
        pages,
        homeSections: homeSections.sort((a, b) => a.order - b.order),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err: any) {
    // Fallback gracioso com valores padrão
    return apiSuccess({
      navigation: DEFAULT_NAVIGATION,
      pages: DEFAULT_PAGES,
      homeSections: DEFAULT_HOME_SECTIONS,
    });
  }
}
