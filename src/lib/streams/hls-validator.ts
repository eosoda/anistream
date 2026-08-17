import { filterUpstreamHeaders, readResponseTextLimited, safeFetch, SafeFetchError } from '../security/safe-fetch';

export async function validateHlsPlaylist(url: string, headers?: Record<string, string>, timeoutMs = 5000): Promise<{ isValid: boolean; contentType?: string; error?: string }> {
  if (!url || typeof url !== 'string') return { isValid: false, error: 'URL inválida' };
  try {
    const requestHeaders = filterUpstreamHeaders({
      'User-Agent': headers?.['User-Agent'] || headers?.['user-agent'] || 'AniStream-HlsValidator/1.0',
      ...(headers?.Referer || headers?.referer ? { Referer: headers.Referer || headers.referer } : {}),
      ...(headers?.Origin || headers?.origin ? { Origin: headers.Origin || headers.origin } : {}),
      ...headers,
    });
    const response = await safeFetch(url, { method: 'GET', headers: requestHeaders, timeoutMs, cache: 'no-store' });
    if (!response.ok) return { isValid: false, error: `HTTP status ${response.status}` };
    const contentType = response.headers.get('content-type') || '';
    const textSample = await readResponseTextLimited(response, 512 * 1024, timeoutMs);
    const validType = /application\/(?:x-)?mpegurl|text\/plain/i.test(contentType);
    if (textSample.includes('#EXTM3U') || validType) return { isValid: true, contentType };
    return { isValid: false, contentType, error: 'Manifesto HLS inválido.' };
  } catch (error) {
    console.warn('[HLS Validation Error]', error instanceof Error ? error.message : error);
    return { isValid: false, error: error instanceof SafeFetchError && error.code === 'TIMEOUT' ? 'Timeout na validação HLS' : 'Falha na validação HLS' };
  }
}
