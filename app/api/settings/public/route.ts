import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';
import { DEFAULT_NAVIGATION_CONFIG } from '@/lib/navigation/defaults';
import { getNavigationConfiguration } from '@/lib/navigation/repository';
import { toPublicNavigation } from '@/lib/navigation/presentation';
import { DEFAULT_HOMEPAGE_DOCUMENT, homepageSectionSummary } from '@/lib/homepage/defaults';
import { getPublishedHomepageDocument } from '@/lib/homepage/repository';

export type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';

export async function GET(_request: NextRequest) {
  try {
    const navigationConfig = await getNavigationConfiguration();
    const publishedHomepage = await getPublishedHomepageDocument();
    return apiSuccess(
      {
        ...toPublicNavigation(navigationConfig),
        homeSections: homepageSectionSummary(publishedHomepage.document),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return apiSuccess({
      ...toPublicNavigation(DEFAULT_NAVIGATION_CONFIG),
      homeSections: homepageSectionSummary(DEFAULT_HOMEPAGE_DOCUMENT),
    });
  }
}
