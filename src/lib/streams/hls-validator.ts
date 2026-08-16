/**
 * Validador de playlists HLS (.m3u8)
 * Verifica status HTTP, Content-Type e presença do manifesto #EXTM3U no corpo.
 */
export async function validateHlsPlaylist(
  url: string,
  headers?: Record<string, string>,
  timeoutMs = 5000
): Promise<{ isValid: boolean; contentType?: string; error?: string }> {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL inválida' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          headers?.['User-Agent'] ||
          headers?.['user-agent'] ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: headers?.Referer || headers?.referer || url,
        Origin: headers?.Origin || headers?.origin || new URL(url).origin,
        ...headers,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { isValid: false, error: `HTTP status ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    const textSample = await res.text();

    const isMpegUrlContentType =
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('text/plain');

    const hasExtM3uHeader = textSample.includes('#EXTM3U');

    if (hasExtM3uHeader || isMpegUrlContentType) {
      return { isValid: true, contentType };
    }

    return {
      isValid: false,
      contentType,
      error: 'Manifesto HLS (#EXTM3U) não encontrado no cabeçalho da resposta',
    };
  } catch (error) {
    console.warn('[HLS Validation Error]', error);
    clearTimeout(timeout);
    return {
      isValid: false,
      error: error instanceof Error && error.name === 'AbortError' ? 'Timeout na validação HLS' : 'Falha na validação HLS',
    };
  }
}
