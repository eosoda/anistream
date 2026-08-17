import { beforeEach, describe, expect, it, vi } from 'vitest';

const lookup = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ default: { lookup } }));

import { readResponseTextLimited, safeFetch, SafeFetchError } from '@/lib/security/safe-fetch';

describe('safeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    lookup.mockReset();
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('revalidates a redirect target and blocks private networks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(safeFetch('https://public.example.test')).rejects.toMatchObject<SafeFetchError>({ code: 'SSRF_BLOCKED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks DNS rebinding on a later redirect hop', async () => {
    lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]).mockResolvedValueOnce([{ address: '10.0.0.8', family: 4 }]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://public.example.test/next' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(safeFetch('https://public.example.test')).rejects.toMatchObject<SafeFetchError>({ code: 'SSRF_BLOCKED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('limits manifest bodies', async () => {
    await expect(readResponseTextLimited(new Response('12345'), 4)).rejects.toMatchObject<SafeFetchError>({ code: 'BODY_TOO_LARGE' });
  });
});
