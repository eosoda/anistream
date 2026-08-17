import type { NextRequest } from 'next/server';

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds configured limit');
    this.name = 'RequestBodyTooLargeError';
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super('Request body is not valid JSON');
    this.name = 'InvalidJsonBodyError';
  }
}

export async function readJsonBodyLimited(request: NextRequest, maxBytes = 1024 * 1024): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new RequestBodyTooLargeError();
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new RequestBodyTooLargeError();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidJsonBodyError();
  }
}
