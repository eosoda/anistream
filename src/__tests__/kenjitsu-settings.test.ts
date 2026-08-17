import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));

import { KENJITSU_BETA_ALLOWLIST, normalizeKenjitsuExtensionSettings } from '@/lib/kenjitsu/settings';

describe('Kenjitsu beta allowlist', () => {
  it('keeps persisted extensions outside the approved list disabled', () => {
    const settings = normalizeKenjitsuExtensionSettings([
      { id: 'anizone', enabled: true, nsfw: false },
      { id: 'anikoto', enabled: true, nsfw: false },
    ]);

    expect(settings.find((item) => item.id === 'anizone')?.enabled).toBe(false);
    expect(settings.find((item) => item.id === 'anikoto')?.enabled).toBe(true);
    expect(settings.filter((item) => item.enabled).map((item) => item.id)).toEqual(
      expect.arrayContaining(KENJITSU_BETA_ALLOWLIST.filter((id) => id === 'anikoto')),
    );
  });
});
