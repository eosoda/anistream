import { describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  adminSession: {
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock('@/lib/db/prisma', () => ({ prisma }));

import { hashAdminSessionToken, verifyAdminToken } from '@/lib/security/admin-auth';

describe('administrative sessions', () => {
  it('migrates a legacy plaintext session to a hash on first use', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    prisma.adminSession.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'session-1', token: 'legacy-token', expiresAt, userId: 'admin-1' });
    prisma.adminSession.update.mockResolvedValue({});
    prisma.adminSession.deleteMany.mockResolvedValue({ count: 0 });

    const result = await verifyAdminToken('legacy-token');

    expect(result).toMatchObject({ authenticated: true, userId: 'admin-1' });
    expect(prisma.adminSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { tokenHash: hashAdminSessionToken('legacy-token'), token: null },
    });
  });

  it('produces a digest that does not equal the browser token', () => {
    expect(hashAdminSessionToken('browser-token')).not.toBe('browser-token');
  });
});
