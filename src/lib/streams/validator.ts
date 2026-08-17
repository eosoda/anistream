import { safeFetch, readResponseTextLimited, filterUpstreamHeaders, SafeFetchError } from '../security/safe-fetch';
import { validateUrlSsrf } from '../security/ssrf';
import { StreamSource, StreamType } from './types';

export interface StreamValidationResult {
  valid: boolean;
  type: StreamType;
  status: number;
  latencyMs: number;
  error?: string;
  isMasterPlaylist?: boolean;
  bandwidth?: number;
  resolution?: string;
}

export async function validateStreamSource(source: StreamSource, timeoutMs = 5000): Promise<StreamValidationResult> {
  const startTime = Date.now();
  const fail = (status: number, error: string): StreamValidationResult => ({ valid: false, type: source.type, status, latencyMs: Date.now() - startTime, error });

  const ssrfCheck = await validateUrlSsrf(source.url);
  if (!ssrfCheck.valid) return fail(403, 'URL rejeitada pelas políticas de segurança.');
  if (source.type === 'embed') return { valid: true, type: 'embed', status: 200, latencyMs: Date.now() - startTime };

  const headers = filterUpstreamHeaders({ 'User-Agent': 'AniStream-StreamValidator/1.0', ...(source.headers || {}) });
  try {
    if (source.type === 'hls') {
      headers.Accept = 'application/vnd.apple.mpegurl, application/x-mpegURL, */*';
      const response = await safeFetch(source.url, { method: 'GET', headers, timeoutMs });
      if (!response.ok) return fail(response.status, 'A fonte HLS não respondeu com sucesso.');

      let content = await readResponseTextLimited(response, 512 * 1024, timeoutMs);
      if (!content.includes('#EXTM3U')) return fail(response.status, 'Manifest HLS inválido.');
      const isMaster = content.includes('#EXT-X-STREAM-INF');
      let hasSegments = content.includes('#EXTINF');
      if (!isMaster && !hasSegments) return fail(response.status, 'Manifest HLS sem segmentos reproduzíveis.');

      if (isMaster) {
        const lines = content.split(/\r?\n/);
        const variantIndex = lines.findIndex((line) => line.startsWith('#EXT-X-STREAM-INF'));
        const variant = lines.slice(variantIndex + 1).find((line) => line.trim() && !line.startsWith('#'));
        if (variant) {
          const variantResponse = await safeFetch(new URL(variant.trim(), source.url).toString(), { headers, timeoutMs });
          if (variantResponse.ok) {
            content = await readResponseTextLimited(variantResponse, 512 * 1024, timeoutMs);
            hasSegments = content.includes('#EXTINF');
          }
        }
      }

      const durationSeconds = Array.from(content.matchAll(/#EXTINF:([\d.]+)/g)).reduce((total, match) => total + Number(match[1]), 0);
      if (!hasSegments || (durationSeconds > 0 && durationSeconds < 300)) return fail(response.status, durationSeconds > 0 ? 'Playlist curta demais.' : 'Playlist HLS sem segmentos reproduzíveis.');
      return { valid: true, type: 'hls', status: response.status, latencyMs: Date.now() - startTime, isMasterPlaylist: isMaster };
    }

    headers.Range = 'bytes=0-1023';
    const response = await safeFetch(source.url, { method: 'GET', headers, timeoutMs });
    if (!response.ok && response.status !== 206) return fail(response.status, 'A fonte de vídeo não respondeu com sucesso.');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('video/') && !contentType.toLowerCase().includes('application/octet-stream')) return fail(response.status, 'Tipo de conteúdo de vídeo inválido.');
    return { valid: true, type: 'mp4', status: response.status, latencyMs: Date.now() - startTime };
  } catch (error) {
    console.warn('[Stream Validation Error]', error instanceof Error ? error.message : error);
    const status = error instanceof SafeFetchError && error.code === 'TIMEOUT' ? 408 : 502;
    return fail(status, status === 408 ? 'Timeout de validação excedido.' : 'Falha ao validar a fonte.');
  }
}

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
    const isMpegUrlContentType = /application\/(?:x-)?mpegurl|text\/plain/i.test(contentType);
    if (textSample.includes('#EXTM3U') || isMpegUrlContentType) return { isValid: true, contentType };
    return { isValid: false, contentType, error: 'Manifesto HLS inválido.' };
  } catch (error) {
    console.warn('[HLS Validation Error]', error instanceof Error ? error.message : error);
    return { isValid: false, error: error instanceof SafeFetchError && error.code === 'TIMEOUT' ? 'Timeout na validação HLS' : 'Falha na validação HLS' };
  }
}
