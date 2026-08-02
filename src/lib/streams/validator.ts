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

export async function validateStreamSource(
  source: StreamSource,
  timeoutMs = 5000
): Promise<StreamValidationResult> {
  const startTime = Date.now();

  // 1. Defesa SSRF e Host Autorizado
  const isServerDiscoveredRelay =
    source.requiresProxy === true &&
    source.id.startsWith('kenjitsu:');
  const ssrfCheck = await validateUrlSsrf(source.url, {
    requireAuthorizedHost: !isServerDiscoveredRelay,
  });
  if (!ssrfCheck.valid) {
    return {
      valid: false,
      type: source.type,
      status: 403,
      latencyMs: Date.now() - startTime,
      error: ssrfCheck.reason || 'URL rejeitada pelas políticas de segurança SSRF',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'AniStream-StreamValidator/1.0',
      ...(source.headers || {}),
    };

    if (source.type === 'embed') {
      return {
        valid: true,
        type: 'embed',
        status: 200,
        latencyMs: Date.now() - startTime,
      };
    }

    if (source.type === 'hls') {
      headers['Accept'] =
        'application/vnd.apple.mpegurl, application/x-mpegURL, */*';

      const response = await fetch(source.url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        // Limitar tamanho lido da resposta do manifest (max 500KB)
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          valid: false,
          type: 'hls',
          status: response.status,
          latencyMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let content = await response.text();

      // Verificar tags M3U8 obrigatórias
      if (!content.includes('#EXTM3U')) {
        return {
          valid: false,
          type: 'hls',
          status: response.status,
          latencyMs,
          error: 'Manifest HLS inválido: tag #EXTM3U ausente',
        };
      }

      const isMaster = content.includes('#EXT-X-STREAM-INF');
      let hasSegments = content.includes('#EXTINF');

      if (!isMaster && !hasSegments) {
        return {
          valid: false,
          type: 'hls',
          status: response.status,
          latencyMs,
          error: 'Manifest HLS sem playlists variantes ou segmentos #EXTINF',
        };
      }

      // Um master manifest pode estar saudável e ainda apontar para preview,
      // trailer ou playlist vazia. Seguimos a primeira variante e exigimos
      // duração mínima plausível para um episódio.
      if (isMaster) {
        const lines = content.split(/\r?\n/);
        const variantIndex = lines.findIndex((line) =>
          line.startsWith('#EXT-X-STREAM-INF')
        );
        const variant = lines
          .slice(variantIndex + 1)
          .find((line) => line.trim() && !line.startsWith('#'));
        if (variant) {
          const variantResponse = await fetch(
            new URL(variant.trim(), source.url).toString(),
            { headers, signal: controller.signal }
          );
          if (variantResponse.ok) {
            content = await variantResponse.text();
            hasSegments = content.includes('#EXTINF');
          }
        }
      }

      const durationSeconds = Array.from(
        content.matchAll(/#EXTINF:([\d.]+)/g)
      ).reduce((total, match) => total + Number(match[1]), 0);
      if (!hasSegments || (durationSeconds > 0 && durationSeconds < 300)) {
        return {
          valid: false,
          type: 'hls',
          status: response.status,
          latencyMs: Date.now() - startTime,
          error:
            durationSeconds > 0
              ? `Playlist curta demais (${Math.round(durationSeconds)}s)`
              : 'Playlist HLS sem segmentos reproduzíveis',
        };
      }

      return {
        valid: true,
        type: 'hls',
        status: response.status,
        latencyMs,
        isMasterPlaylist: isMaster,
      };
    } else {
      // Validação de arquivo MP4 via HEAD ou Range parcial (primeiro 1KB)
      headers['Range'] = 'bytes=0-1023';

      const response = await fetch(source.url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok && response.status !== 206) {
        return {
          valid: false,
          type: 'mp4',
          status: response.status,
          latencyMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (
        !contentType.toLowerCase().includes('video/') &&
        !contentType.toLowerCase().includes('application/octet-stream')
      ) {
        return {
          valid: false,
          type: 'mp4',
          status: response.status,
          latencyMs,
          error: `Content-Type inválido para MP4: ${contentType}`,
        };
      }

      return {
        valid: true,
        type: 'mp4',
        status: response.status,
        latencyMs,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (err.name === 'AbortError') {
      return {
        valid: false,
        type: source.type,
        status: 408,
        latencyMs,
        error: `Timeout de validação excedido (${timeoutMs}ms)`,
      };
    }

    return {
      valid: false,
      type: source.type,
      status: 500,
      latencyMs,
      error: `Erro ao validar stream: ${err.message}`,
    };
  }
}
