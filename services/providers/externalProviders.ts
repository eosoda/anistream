export interface NormalizedEpisode {
  provider: string;
  animeId: string;
  episodeId: string;
  season: number;
  number: number;
  title?: string;
  thumbnail?: string;
  audio?: 'sub' | 'dub' | 'unknown';
}

export interface NormalizedSource {
  provider: string;
  episodeId: string;
  url: string;
  type: 'hls' | 'mp4' | 'embed' | 'unknown';
  quality?: string;
  audio?: 'sub' | 'dub' | 'unknown';
  headers?: Record<string, string>;
  subtitles?: Array<{ language: string; url: string }>;
}

export interface ProviderResult<T> {
  provider: string;
  success: boolean;
  durationMs: number;
  data: T | null;
  error?: string;
}

// Reusable fetch helper with AbortController timeout & HTTP validation
async function fetchWithTimeout<T>(
  url: string,
  providerName: string,
  transform: (json: any) => T,
  headers?: Record<string, string>,
  timeoutMs = 6000
): Promise<ProviderResult<T>> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Resposta de erro da API (HTTP ${response.status})`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('Formato de resposta inválido (JSON esperado)');
    }

    if (data === null || data === undefined) {
      throw new Error('Resposta nula ou vazia da API');
    }

    const transformed = transform(data);
    return {
      provider: providerName,
      success: true,
      durationMs: Date.now() - startTime,
      data: transformed,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      provider: providerName,
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.name === 'AbortError' ? `Timeout (${timeoutMs}ms)` : err.message,
    };
  }
}

// ==========================================
// 1. Kenjitsu / AniZone Provider
// ==========================================
export async function getAniZoneSources(
  slug: string,
  episodeNum: number,
  dub = false
): Promise<ProviderResult<NormalizedSource[]>> {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const episodeSuffix = dub ? `-episode-${episodeNum}-dub` : `-episode-${episodeNum}`;
  const url = `https://kenjitsu.koyeb.app/api/anizone/sources/-${cleanSlug}${episodeSuffix}`;

  return fetchWithTimeout<NormalizedSource[]>(
    url,
    'Kenjitsu / AniZone',
    (data: any) => {
      const sourcesList = data?.data?.sources || data?.sources || [];
      if (!Array.isArray(sourcesList)) return [];

      return sourcesList.map((s: any) => ({
        provider: 'AniZone',
        episodeId: `${cleanSlug}-ep-${episodeNum}`,
        url: s.url || s.file || s.src,
        type: (s.url || '').includes('.m3u8') ? 'hls' : (s.url || '').includes('.mp4') ? 'mp4' : 'embed',
        quality: s.quality || 'Auto',
        audio: dub ? 'dub' : 'sub',
        headers: {
          Referer: 'https://anizone.to/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }));
    }
  );
}

// ==========================================
// 2. GogoAnime (Consumet 5 Instâncias Fallback)
// ==========================================
const CONSUMET_INSTANCES = [
  'https://api-consumet-org-five.vercel.app',
  'https://consumet-api-1.vercel.app',
  'https://anime-api-iota.vercel.app',
  'https://consumet-api-zeta.vercel.app',
  'https://consumet-api-ecru.vercel.app',
];

export async function getGogoAnimeConsumetSources(
  title: string,
  episodeNum: number,
  category: 'sub' | 'dub' = 'sub'
): Promise<ProviderResult<NormalizedSource[]>> {
  const startTime = Date.now();

  for (const instance of CONSUMET_INSTANCES) {
    try {
      const searchRes = await fetchWithTimeout<any[]>(
        `${instance}/anime/gogoanime/${encodeURIComponent(title)}`,
        'GogoAnime',
        (json) => json?.results || [],
        undefined,
        4000
      );

      if (!searchRes.success || !searchRes.data || searchRes.data.length === 0) {
        continue;
      }

      const targetAnime = searchRes.data[0];
      const animeId = targetAnime.id;

      const infoRes = await fetchWithTimeout<any>(
        `${instance}/anime/gogoanime/info/${animeId}`,
        'GogoAnime-Info',
        (json) => json,
        undefined,
        4000
      );

      if (!infoRes.success || !infoRes.data || !Array.isArray(infoRes.data.episodes)) {
        continue;
      }

      const matchedEp = infoRes.data.episodes.find((e: any) => e.number === episodeNum) || infoRes.data.episodes[0];
      if (!matchedEp) continue;

      const watchRes = await fetchWithTimeout<NormalizedSource[]>(
        `${instance}/anime/gogoanime/watch/${matchedEp.id}?category=${category}`,
        'GogoAnime-Watch',
        (json) => {
          const rawSources = json?.sources || [];
          const headers = json?.headers || { Referer: 'https://gogoanime.cl/' };
          const subtitles = (json?.subtitles || []).map((sub: any) => ({
            language: sub.lang || sub.language || 'English',
            url: sub.url,
          }));

          return rawSources.map((s: any) => ({
            provider: 'GogoAnime',
            episodeId: matchedEp.id,
            url: s.url,
            type: s.isM3U8 || s.url.includes('.m3u8') ? 'hls' : 'mp4',
            quality: s.quality || 'Auto',
            audio: category,
            headers,
            subtitles,
          }));
        },
        undefined,
        4500
      );

      if (watchRes.success && watchRes.data && watchRes.data.length > 0) {
        return watchRes;
      }
    } catch {
      // Fallback para a próxima instância
    }
  }

  return {
    provider: 'GogoAnime (Consumet)',
    success: false,
    durationMs: Date.now() - startTime,
    data: null,
    error: 'Todas as 5 instâncias do Consumet falharam ou não retornaram mídias.',
  };
}

// ==========================================
// 3. HiAnime / Zoro (Consumet / Zoro)
// ==========================================
export async function getZoroConsumetSources(
  title: string,
  episodeNum: number,
  category: 'sub' | 'dub' = 'sub'
): Promise<ProviderResult<NormalizedSource[]>> {
  const baseUrl = CONSUMET_INSTANCES[0];
  const startTime = Date.now();

  try {
    const searchRes = await fetchWithTimeout<any[]>(
      `${baseUrl}/anime/zoro/${encodeURIComponent(title)}`,
      'Zoro',
      (json) => json?.results || []
    );

    if (!searchRes.success || !searchRes.data || searchRes.data.length === 0) {
      throw new Error('Anime não encontrado no Zoro');
    }

    const animeId = searchRes.data[0].id;

    const infoRes = await fetchWithTimeout<any>(
      `${baseUrl}/anime/zoro/info/${animeId}`,
      'Zoro-Info',
      (json) => json
    );

    if (!infoRes.success || !infoRes.data || !Array.isArray(infoRes.data.episodes)) {
      throw new Error('Episódios não retornados pelo Zoro');
    }

    const ep = infoRes.data.episodes.find((e: any) => e.number === episodeNum) || infoRes.data.episodes[0];
    if (!ep) throw new Error('Episódio não localizado');

    return fetchWithTimeout<NormalizedSource[]>(
      `${baseUrl}/anime/zoro/watch/${ep.id}?server=hd-1&category=${category}`,
      'HiAnime / Zoro',
      (json) => {
        const rawSources = json?.sources || [];
        const headers = json?.headers || { Referer: 'https://hianime.to/' };
        const subtitles = (json?.subtitles || []).map((s: any) => ({
          language: s.lang || s.language || 'English',
          url: s.url,
        }));

        return rawSources.map((s: any) => ({
          provider: 'HiAnime / Zoro',
          episodeId: ep.id,
          url: s.url,
          type: 'hls',
          quality: s.quality || 'Auto',
          audio: category,
          headers,
          subtitles,
        }));
      }
    );
  } catch (err: any) {
    return {
      provider: 'HiAnime / Zoro',
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.message,
    };
  }
}

// ==========================================
// 4. Anify Provider
// ==========================================
export async function getAnifySources(
  aniListId: number,
  provider = 'zoro',
  preferDub = true
): Promise<ProviderResult<NormalizedSource[]>> {
  const startTime = Date.now();

  try {
    const epUrl = `https://api.anify.tv/episodes/${aniListId}?provider=${provider}&preferDub=${preferDub}`;
    const epRes = await fetchWithTimeout<any[]>(
      epUrl,
      'Anify-Episodes',
      (json) => json || []
    );

    if (!epRes.success || !epRes.data || epRes.data.length === 0) {
      throw new Error('Nenhum episódio retornado pela Anify');
    }

    const providerId = epRes.data[0]?.id || epRes.data[0]?.episodes?.[0]?.id;
    if (!providerId) throw new Error('ID de provedor Anify inválido');

    const sourcesUrl = `https://api.anify.tv/sources?providerId=${encodeURIComponent(providerId)}`;
    return fetchWithTimeout<NormalizedSource[]>(
      sourcesUrl,
      'Anify',
      (json) => {
        const sources = json?.sources || [];
        const headers = json?.headers || {};
        const subtitles = (json?.subtitles || []).map((s: any) => ({
          language: s.lang || 'PT-BR',
          url: s.url,
        }));

        return sources.map((s: any) => ({
          provider: 'Anify',
          episodeId: String(providerId),
          url: s.url,
          type: s.url.includes('.m3u8') ? 'hls' : 'mp4',
          quality: s.quality || 'Auto',
          audio: preferDub ? 'dub' : 'sub',
          headers,
          subtitles,
        }));
      }
    );
  } catch (err: any) {
    return {
      provider: 'Anify',
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.message,
    };
  }
}

// ==========================================
// 5. AnimesOnline Scraper Provider
// ==========================================
export async function getAnimesOnlineSources(
  query: string,
  episodeNum: number
): Promise<ProviderResult<NormalizedSource[]>> {
  const startTime = Date.now();
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const epUrl = `https://animesonline.cloud/episodio/${slug}-episodio-${episodeNum}`;

  try {
    const res = await fetch(epUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://animesonline.cloud/',
      },
    });

    if (!res.ok) {
      throw new Error(`Página AnimesOnline HTTP ${res.status}`);
    }

    const html = await res.text();
    const iframeMatches = [...html.matchAll(/src=["'](https?:\/\/[^"']+)["']/gi)];
    const sources: NormalizedSource[] = [];

    for (const match of iframeMatches) {
      const srcUrl = match[1];
      if (srcUrl.includes('player') || srcUrl.includes('embed') || srcUrl.includes('video')) {
        sources.push({
          provider: 'AnimesOnline',
          episodeId: `${slug}-${episodeNum}`,
          url: srcUrl,
          type: 'embed',
          quality: '1080p',
          audio: 'dub',
          headers: { Referer: epUrl },
        });
      }
    }

    return {
      provider: 'AnimesOnline',
      success: sources.length > 0,
      durationMs: Date.now() - startTime,
      data: sources,
    };
  } catch (err: any) {
    return {
      provider: 'AnimesOnline',
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.message,
    };
  }
}

// ==========================================
// 6. WarezCDN / Superflix Provider
// ==========================================
const WAREZCDN_HOSTS = [
  'https://warezcdn.lat',
  'https://warezcdn.site',
  'https://superflixapi.pro',
  'https://superflixapi.rest',
];

export async function getWarezCDNSources(
  imdbId: string,
  season: number,
  episode: number
): Promise<ProviderResult<NormalizedSource[]>> {
  const startTime = Date.now();
  const sources: NormalizedSource[] = [];

  for (const host of WAREZCDN_HOSTS) {
    try {
      const targetUrl = `${host}/serie/${imdbId}/${season}/${episode}`;
      sources.push({
        provider: 'WarezCDN / Superflix',
        episodeId: `warez-${imdbId}-s${season}e${episode}`,
        url: targetUrl,
        type: 'embed',
        quality: '1080p',
        audio: 'dub',
        headers: { Referer: host },
      });
    } catch {
      // Ignorar hosts offline
    }
  }

  return {
    provider: 'WarezCDN / Superflix',
    success: sources.length > 0,
    durationMs: Date.now() - startTime,
    data: sources,
  };
}

// ==========================================
// 7. XPass / 2Embed Provider
// ==========================================
export async function getXPass2EmbedSources(
  tmdbId: string,
  season = 1,
  episode = 1,
  title?: string
): Promise<ProviderResult<NormalizedSource[]>> {
  const startTime = Date.now();
  const playerUrl = `https://play.xpass.top/e/tv/${tmdbId}/${season}/${episode}`;

  try {
    const playerResponse = await fetch(playerUrl, {
      headers: {
        Referer: 'https://play.xpass.top/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });
    if (!playerResponse.ok) {
      throw new Error(`Player XPass HTTP ${playerResponse.status}`);
    }

    const html = await playerResponse.text();
    const dataPath = html.match(/dataUrl\s*=\s*["']([^"']+)["']/i)?.[1];
    let playlistPath =
      html.match(/"playlist"\s*:\s*"([^"]+playlist\.json)"/i)?.[1] ||
      html.match(/playlist\s*:\s*["']([^"']+playlist\.json)["']/i)?.[1];

    if (dataPath) {
      const serversResponse = await fetch(new URL(dataPath, playerUrl), {
        headers: {
          Referer: playerUrl,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      });
      if (serversResponse.ok) {
        const servers = (await serversResponse.json()) as Array<{
          name?: string;
          url?: string;
        }>;
        // O endpoint TIK costuma entregar manifests válidos com segmentos
        // expirados. VIP é o espelho estável e sem HTML publicitário.
        const preferred = servers.find(
          (server) =>
            server.name?.toUpperCase().startsWith('VIP') &&
            server.url?.includes('playlist.json')
        );
        playlistPath =
          preferred?.url ||
          servers.find((server) => server.url?.includes('playlist.json'))?.url ||
          playlistPath;
      }
    }

    if (!playlistPath) {
      throw new Error('Playlist JSON não encontrada no player XPass');
    }

    const playlistUrl = new URL(playlistPath, playerUrl).toString();
    const playlistResponse = await fetch(playlistUrl, {
      headers: {
        Referer: playerUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });
    if (!playlistResponse.ok) {
      throw new Error(`Playlist XPass HTTP ${playlistResponse.status}`);
    }

    const playlistJson = await playlistResponse.json();
    const rawSources =
      playlistJson?.playlist?.flatMap((item: any) => item?.sources || []) || [];
    const sources: NormalizedSource[] = rawSources
      .filter((source: any) => typeof source?.file === 'string')
      .map((source: any, index: number) => ({
        provider: 'Xpass Direct',
        episodeId: `xpass-${tmdbId}-s${season}e${episode}-${index}`,
        url: source.file,
        type:
          source.type === 'hls' || source.file.includes('.m3u8')
            ? 'hls'
            : source.file.includes('.mp4')
            ? 'mp4'
            : 'unknown',
        quality: source.label || 'Auto',
        audio: 'sub',
        headers: {
          Referer: playerUrl,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }))
      .filter((source: NormalizedSource) => source.type !== 'unknown');

    return {
      provider: 'XPass Direct',
      success: sources.length > 0,
      durationMs: Date.now() - startTime,
      data: sources,
      error: sources.length > 0 ? undefined : 'XPass não retornou streams diretos',
    };
  } catch (err: any) {
    return {
      provider: 'XPass Direct',
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.message,
    };
  }
}
