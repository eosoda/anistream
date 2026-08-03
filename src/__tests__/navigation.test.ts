import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION_CONFIG, migrateLegacyNavigation } from '@/lib/navigation/defaults';
import { buildNavigationPreview } from '@/lib/navigation/presentation';
import { NavigationSaveSchema } from '@/schemas/navigation';

function saveInput(overrides: Record<string, unknown> = {}) {
  return {
    navigation: DEFAULT_NAVIGATION_CONFIG.navigation,
    mobileBottomIds: DEFAULT_NAVIGATION_CONFIG.mobileBottomIds,
    pages: DEFAULT_NAVIGATION_CONFIG.pages,
    expectedRevision: DEFAULT_NAVIGATION_CONFIG.revision,
    ...overrides,
  };
}

describe('public navigation contract', () => {
  it('ships seven official destinations and three configurable mobile slots', () => {
    expect(DEFAULT_NAVIGATION_CONFIG.navigation.map((item) => item.id)).toEqual([
      'home', 'popular', 'seasons', 'calendar', 'movies', 'catalog', 'favorites',
    ]);
    expect(DEFAULT_NAVIGATION_CONFIG.mobileBottomIds).toEqual(['home', 'catalog', 'favorites']);
    expect(DEFAULT_NAVIGATION_CONFIG.pages).toHaveLength(6);
  });

  it('migrates legacy arrays without losing labels or visibility', () => {
    const migrated = migrateLegacyNavigation(
      [
        { id: 'home', label: 'Começo', href: '/', enabled: true, order: 1 },
        { id: 'movies', label: 'Cinema', href: '/filmes', enabled: false, order: 2 },
      ],
      [{ id: 'movies', name: 'Filmes', href: '/filmes', enabled: false, disabledMessage: 'Em revisão.' }],
    );

    expect(migrated.navigation.find((item) => item.id === 'home')?.label).toBe('Começo');
    expect(migrated.navigation.find((item) => item.id === 'movies')?.enabled).toBe(false);
    expect(migrated.navigation).toHaveLength(7);
    expect(migrated.pages.find((page) => page.id === 'movies')?.disabledMessage).toBe('Em revisão.');
  });

  it('rejects external routes, duplicate mobile slots and disabled mobile pages', () => {
    const external = structuredClone(saveInput()) as any;
    external.navigation[0].href = 'https://example.com';
    expect(NavigationSaveSchema.safeParse(external).success).toBe(false);

    const duplicate = saveInput({ mobileBottomIds: ['home', 'home', 'favorites'] });
    expect(NavigationSaveSchema.safeParse(duplicate).success).toBe(false);

    const disabledMobile = structuredClone(saveInput()) as any;
    disabledMobile.pages.find((page: any) => page.id === 'catalog').enabled = false;
    expect(NavigationSaveSchema.safeParse(disabledMobile).success).toBe(false);
  });

  it('rejects redirects to a disabled page and filters disabled pages from preview', () => {
    const input = structuredClone(saveInput()) as any;
    input.pages.find((page: any) => page.id === 'movies').enabled = false;
    input.pages.find((page: any) => page.id === 'movies').redirectHref = '/filmes';
    expect(NavigationSaveSchema.safeParse(input).success).toBe(false);

    const config = structuredClone(DEFAULT_NAVIGATION_CONFIG);
    config.pages.find((page) => page.id === 'movies')!.enabled = false;
    const preview = buildNavigationPreview(config);
    expect(preview.desktop.some((item) => item.id === 'movies')).toBe(false);
    expect(preview.footer.some((item) => item.id === 'movies')).toBe(false);
  });
});
