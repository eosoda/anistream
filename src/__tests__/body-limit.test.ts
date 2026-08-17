import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { InvalidJsonBodyError, RequestBodyTooLargeError, readJsonBodyLimited } from '@/lib/security/body-limit';

describe('limited JSON bodies', () => {
  it('rejects malformed JSON with a typed error', async () => {
    const request = new NextRequest('http://localhost/api/test', { method: 'POST', body: '{' });
    await expect(readJsonBodyLimited(request, 1024)).rejects.toBeInstanceOf(InvalidJsonBodyError);
  });

  it('rejects bodies over the configured limit before parsing', async () => {
    const request = new NextRequest('http://localhost/api/test', { method: 'POST', body: '12345' });
    await expect(readJsonBodyLimited(request, 4)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
