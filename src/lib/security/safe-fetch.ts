import { validateUrlSsrf } from './ssrf';

const ALLOWED_FORWARD_HEADERS = new Set(['accept', 'cookie', 'origin', 'range', 'referer', 'user-agent']);
const MAX_HEADER_VALUE_LENGTH = 4096;
const MAX_FORWARD_HEADER_BYTES = 8192;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class SafeFetchError extends Error {
  constructor(message: string, public readonly code = 'SAFE_FETCH_FAILED') {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export function filterUpstreamHeaders(input: HeadersInit | Record<string, string> | undefined): Record<string, string> {
  if (!input) return {};
  const headers = new Headers(input);
  const result: Record<string, string> = {};
  let totalBytes = 0;
  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (!ALLOWED_FORWARD_HEADERS.has(normalized) || value.length > MAX_HEADER_VALUE_LENGTH) return;
    totalBytes += Buffer.byteLength(value, 'utf8');
    if (totalBytes <= MAX_FORWARD_HEADER_BYTES) result[normalized] = value;
  });
  return result;
}

function createTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

export interface SafeFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
  /** Webhook JSON requests need this one additional, non-hop-by-hop header. */
  allowContentType?: boolean;
}

/** Fetches an external URL while revalidating DNS/SSRF policy per redirect. */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { maxRedirects = 3, timeoutMs = 10000, allowContentType = false, headers, signal: externalSignalValue, ...requestInit } = options;
  const externalSignal = externalSignalValue ?? undefined;
  let currentUrl = url;

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const validation = await validateUrlSsrf(currentUrl);
    if (!validation.valid) throw new SafeFetchError('Destino externo bloqueado', 'SSRF_BLOCKED');

    const timeout = createTimeoutSignal(timeoutMs, externalSignal);
    try {
      const response = await fetch(currentUrl, {
        ...requestInit,
        headers: {
          ...filterUpstreamHeaders(headers),
          ...(allowContentType && headers && new Headers(headers).get('content-type')
            ? { 'content-type': new Headers(headers).get('content-type')! }
            : {}),
        },
        redirect: 'manual',
        signal: timeout.signal,
      });
      if (!REDIRECT_STATUSES.has(response.status)) return response;

      const location = response.headers.get('location');
      if (!location || redirect === maxRedirects) {
        throw new SafeFetchError('Número máximo de redirects externos excedido', 'REDIRECT_LIMIT');
      }
      currentUrl = new URL(location, currentUrl).toString();
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      if (error instanceof Error && error.name === 'AbortError') throw new SafeFetchError('Timeout na requisição externa', 'TIMEOUT');
      throw new SafeFetchError('Falha na requisição externa', 'UPSTREAM_ERROR');
    } finally {
      timeout.dispose();
    }
  }

  throw new SafeFetchError('Falha na requisição externa', 'UPSTREAM_ERROR');
}

export async function readResponseTextLimited(response: Response, maxBytes = 512 * 1024, timeoutMs = 10000): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new SafeFetchError('Resposta externa excede o limite', 'BODY_TOO_LARGE');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          void reader.cancel();
          reject(new SafeFetchError('Timeout na resposta externa', 'TIMEOUT'));
        }, timeoutMs);
      });
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await Promise.race([reader.read(), timeout]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      const { done, value } = result;
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new SafeFetchError('Resposta externa excede o limite', 'BODY_TOO_LARGE');
      }
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
  return new TextDecoder().decode(bytes);
}

/** Adds an idle timeout to an otherwise unbounded media response stream. */
export function withIdleTimeout(body: ReadableStream<Uint8Array>, timeoutMs = 30000): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const pump = async () => {
        clear();
        timer = setTimeout(() => {
          closed = true;
          void reader.cancel();
          controller.error(new SafeFetchError('Timeout na transmissão externa', 'TIMEOUT'));
        }, timeoutMs);

        try {
          const { done, value } = await reader.read();
          clear();
          if (closed) return;
          if (done) {
            closed = true;
            controller.close();
            return;
          }
          controller.enqueue(value);
          void pump();
        } catch (error) {
          clear();
          if (closed) return;
          closed = true;
          controller.error(error);
        }
      };

      void pump();
    },
    cancel(reason) {
      closed = true;
      clear();
      return reader.cancel(reason);
    },
  });
}
