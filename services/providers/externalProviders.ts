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
  transform: (json: any) => T
): Promise<ProviderResult<T>> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    if (data === null || data === undefined) {
      throw new Error('Resposta vazia da API');
    }

    const transformed = transform(data);
    return {
      provider: providerName,
      success: true,
      durationMs: Date.now() - startTime,
      data: transformed,
    };
  } catch (err: any) {
    return {
      provider: providerName,
      success: false,
      durationMs: Date.now() - startTime,
      data: null,
      error: err.message || 'Falha na requisição',
    };
  } finally {
    clearTimeout(timeout);
  }
}

// 1. TVmaze (Temporadas e Episódios apenas)
export async function getTVmazeEpisodes(title: string): Promise<ProviderResult<NormalizedEpisode[]>> {
  const encodedTitle = encodeURIComponent(title);
  const searchUrl = `https://api.tvmaze.com/search/shows?q=${encodedTitle}`;

  const searchResult = await fetchWithTimeout<number | null>(searchUrl, 'tvmaze', (json) => {
    if (Array.isArray(json) && json.length > 0 && json[0]?.show?.id) {
      return json[0].show.id;
    }
    return null;
  });

  if (!searchResult.success || !searchResult.data) {
    return {
      provider: 'tvmaze',
      success: false,
      durationMs: searchResult.durationMs,
      data: null,
      error: searchResult.error || 'Show não encontrado',
    };
  }

  const showId = searchResult.data;
  const episodesUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;

  return fetchWithTimeout<NormalizedEpisode[]>(episodesUrl, 'tvmaze', (json) => {
    if (!Array.isArray(json)) return [];
    return json.map((ep: any) => ({
      provider: 'tvmaze',
      animeId: String(showId),
      episodeId: String(ep.id),
      season: ep.season || 1,
      number: ep.number || 1,
      title: ep.name || `Episódio ${ep.number}`,
      thumbnail: ep.image?.medium || ep.image?.original,
      audio: 'unknown',
    }));
  });
}

// 2. AniZone / Kenjitsu
export async function getAniZoneEpisodes(title: string): Promise<ProviderResult<NormalizedEpisode[]>> {
  const encodedTitle = encodeURIComponent(title);
  const searchUrl = `https://kenjitsu.koyeb.app/api/anizone/anime/search?q=${encodedTitle}`;

  return fetchWithTimeout<NormalizedEpisode[]>(searchUrl, 'anizone', (json) => {
    const anime = Array.isArray(json) ? json[0] : json?.results?.[0] || json;
    if (!anime) return [];

    const slug = anime.slug || anime.id || encodedTitle;
    const totalEp = anime.totalEpisodes || anime.episodesCount || 12;
    const episodes: NormalizedEpisode[] = [];

    for (let i = 1; i <= totalEp; i++) {
      episodes.push({
        provider: 'anizone',
        animeId: String(slug),
        episodeId: `${slug}-episode-${i}`,
        season: 1,
        number: i,
        title: `Episódio ${i}`,
        thumbnail: anime.coverImage || anime.image,
        audio: anime.isDubbed ? 'dub' : 'sub',
      });
    }
    return episodes;
  });
}

export async function getAniZoneSources(episodeId: string): Promise<ProviderResult<NormalizedSource[]>> {
  const encodedEpId = encodeURIComponent(episodeId);
  const sourcesUrl = `https://kenjitsu.koyeb.app/api/anizone/sources/${encodedEpId}`;

  return fetchWithTimeout<NormalizedSource[]>(sourcesUrl, 'anizone', (json) => {
    const sources: NormalizedSource[] = [];
    const rawSources = json?.sources || (Array.isArray(json) ? json : []);

    for (const src of rawSources) {
      if (src?.url) {
        sources.push({
          provider: 'anizone',
          episodeId,
          url: src.url,
          type: src.type === 'hls' || src.url.includes('.m3u8') ? 'hls' : src.type || 'mp4',
          quality: src.quality || 'auto',
          audio: src.dub ? 'dub' : 'sub',
          headers: src.headers || undefined,
        });
      }
    }
    return sources;
  });
}

// 3. Miruro
export async function getMiruroEpisodes(aniListId: string | number): Promise<ProviderResult<NormalizedEpisode[]>> {
  const encodedId = encodeURIComponent(String(aniListId));
  const url = `https://mirurotvapi.vercel.app/api/episodes/${encodedId}`;

  return fetchWithTimeout<NormalizedEpisode[]>(url, 'miruro', (json) => {
    const list = Array.isArray(json) ? json : json?.episodes || [];
    return list.map((ep: any) => ({
      provider: 'miruro',
      animeId: String(aniListId),
      episodeId: ep.id || ep.watchId || `${aniListId}-${ep.number}`,
      season: ep.season || 1,
      number: ep.number || 1,
      title: ep.title || `Episódio ${ep.number}`,
      thumbnail: ep.image || ep.thumbnail,
      audio: ep.isDub ? 'dub' : 'sub',
    }));
  });
}

export async function getMiruroSources(watchId: string): Promise<ProviderResult<NormalizedSource[]>> {
  const encodedWatchId = encodeURIComponent(watchId);
  const url = `https://mirurotvapi.vercel.app/api/${encodedWatchId}`;

  return fetchWithTimeout<NormalizedSource[]>(url, 'miruro', (json) => {
    const sources: NormalizedSource[] = [];
    const rawSources = json?.sources || (Array.isArray(json) ? json : []);

    for (const src of rawSources) {
      if (src?.url) {
        sources.push({
          provider: 'miruro',
          episodeId: watchId,
          url: src.url,
          type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
          quality: src.quality || 'auto',
          audio: json?.isDub ? 'dub' : 'sub',
          headers: src.headers || undefined,
        });
      }
    }
    return sources;
  });
}

// 4. Anify
export async function getAnifyEpisodes(
  aniListId: string | number,
  provider: 'zoro' | 'animepahe' | 'animedao' = 'zoro',
  preferDub: boolean = false
): Promise<ProviderResult<NormalizedEpisode[]>> {
  const encodedId = encodeURIComponent(String(aniListId));
  const encodedProvider = encodeURIComponent(provider);
  const url = `https://api.anify.tv/episodes/${encodedId}?provider=${encodedProvider}&preferDub=${preferDub}`;

  return fetchWithTimeout<NormalizedEpisode[]>(url, `anify-${provider}`, (json) => {
    const list = Array.isArray(json) ? json : json?.episodes || [];
    return list.map((ep: any) => ({
      provider: `anify-${provider}`,
      animeId: String(aniListId),
      episodeId: ep.id || String(ep.number),
      season: 1,
      number: ep.number || 1,
      title: ep.title || `Episódio ${ep.number}`,
      thumbnail: ep.img || ep.thumbnail,
      audio: preferDub ? 'dub' : 'sub',
    }));
  });
}

export async function getAnifySources(
  providerId: 'zoro' | 'animepahe' | 'animedao',
  watchId: string,
  preferDub: boolean = false
): Promise<ProviderResult<NormalizedSource[]>> {
  const encodedProvider = encodeURIComponent(providerId);
  const encodedWatchId = encodeURIComponent(watchId);
  const url = `https://api.anify.tv/sources?providerId=${encodedProvider}&watchId=${encodedWatchId}&preferDub=${preferDub}`;

  return fetchWithTimeout<NormalizedSource[]>(url, `anify-${providerId}`, (json) => {
    const sources: NormalizedSource[] = [];
    const rawSources = json?.sources || (Array.isArray(json) ? json : []);

    for (const src of rawSources) {
      if (src?.url) {
        sources.push({
          provider: `anify-${providerId}`,
          episodeId: watchId,
          url: src.url,
          type: src.type === 'hls' || src.url.includes('.m3u8') ? 'hls' : 'mp4',
          quality: src.quality || 'auto',
          audio: preferDub ? 'dub' : 'sub',
          headers: json?.headers || undefined,
        });
      }
    }
    return sources;
  });
}

// 5. Consumet / Gogoanime
const CONSUMET_BASE = process.env.CONSUMET_BASE_URL || 'https://api.consumet.org';

export async function getConsumetEpisodes(title: string): Promise<ProviderResult<NormalizedEpisode[]>> {
  const encodedTitle = encodeURIComponent(title);
  const searchUrl = `${CONSUMET_BASE}/anime/gogoanime/${encodedTitle}`;

  const searchRes = await fetchWithTimeout<string | null>(searchUrl, 'consumet', (json) => {
    const results = json?.results || (Array.isArray(json) ? json : []);
    return results[0]?.id || null;
  });

  if (!searchRes.success || !searchRes.data) {
    return {
      provider: 'consumet',
      success: false,
      durationMs: searchRes.durationMs,
      data: null,
      error: searchRes.error || 'Anime não encontrado no Consumet',
    };
  }

  const animeId = searchRes.data;
  const infoUrl = `${CONSUMET_BASE}/anime/gogoanime/info/${encodeURIComponent(animeId)}`;

  return fetchWithTimeout<NormalizedEpisode[]>(infoUrl, 'consumet', (json) => {
    const episodes = json?.episodes || [];
    return episodes.map((ep: any) => ({
      provider: 'consumet',
      animeId,
      episodeId: ep.id,
      season: 1,
      number: ep.number || 1,
      title: ep.title || `Episódio ${ep.number}`,
      audio: ep.id?.includes('-dub') ? 'dub' : 'sub',
    }));
  });
}

export async function getConsumetSources(episodeId: string): Promise<ProviderResult<NormalizedSource[]>> {
  const encodedEpId = encodeURIComponent(episodeId);
  const url = `${CONSUMET_BASE}/anime/gogoanime/watch/${encodedEpId}`;

  return fetchWithTimeout<NormalizedSource[]>(url, 'consumet', (json) => {
    const sources: NormalizedSource[] = [];
    const rawSources = json?.sources || [];

    for (const src of rawSources) {
      if (src?.url) {
        sources.push({
          provider: 'consumet',
          episodeId,
          url: src.url,
          type: src.isM3U8 || src.url.includes('.m3u8') ? 'hls' : 'mp4',
          quality: src.quality || 'auto',
          headers: json?.headers || undefined,
        });
      }
    }
    return sources;
  });
}

// 6. 2Embed (Embeds Apenas)
export function get2EmbedUrl(idOrImdb: string, season?: number, episode?: number): NormalizedSource {
  const cleanId = encodeURIComponent(idOrImdb);
  let embedUrl = `https://www.2embed.cc/embed/${cleanId}`;

  if (season !== undefined && episode !== undefined && Number.isInteger(season) && Number.isInteger(episode)) {
    embedUrl = `https://www.2embed.cc/embed/${cleanId}?s=${season}&e=${episode}`;
  }

  return {
    provider: '2embed',
    episodeId: `${cleanId}-s${season || 1}-e${episode || 1}`,
    url: embedUrl,
    type: 'embed',
  };
}

// 7. Xpass (Embeds Apenas)
export function getXpassEmbedUrl(tmdbId: number, season?: number, episode?: number): NormalizedSource | null {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return null;

  let embedUrl = `https://play.xpass.top/e/movie/${tmdbId}`;

  if (season !== undefined && episode !== undefined) {
    if (!Number.isInteger(season) || season <= 0 || !Number.isInteger(episode) || episode <= 0) {
      return null;
    }
    embedUrl = `https://play.xpass.top/e/tv/${tmdbId}/${season}/${episode}`;
  }

  return {
    provider: 'xpass',
    episodeId: `tmdb-${tmdbId}-s${season || 1}-e${episode || 1}`,
    url: embedUrl,
    type: 'embed',
  };
}

// 8. ApiPlayer (Embeds Apenas)
export function getApiPlayerEmbedUrl(tmdbId: number, season: number, episode: number): NormalizedSource | null {
  if (
    !Number.isInteger(tmdbId) || tmdbId <= 0 ||
    !Number.isInteger(season) || season <= 0 ||
    !Number.isInteger(episode) || episode <= 0
  ) {
    return null;
  }

  return {
    provider: 'apiplayer',
    episodeId: `tmdb-${tmdbId}-s${season}-e${episode}`,
    url: `https://apiplayer.ru/embed/tv/${tmdbId}/${season}/${episode}`,
    type: 'embed',
  };
}

// 9. AnimesOnline (Localização de URLs públicas)
export function getAnimesOnlineEpisodeUrl(slug: string, episodeNumber: number): NormalizedEpisode {
  const cleanSlug = encodeURIComponent(slug);
  const epNum = Math.max(1, Math.floor(episodeNumber));

  return {
    provider: 'animesonline',
    animeId: cleanSlug,
    episodeId: `${cleanSlug}-episodio-${epNum}`,
    season: 1,
    number: epNum,
    title: `Episódio ${epNum}`,
  };
}

// 10. WarezCDN & SuperFlix (Indisponíveis por falta de API pública)
export function getWarezCDNStatus(): ProviderResult<null> {
  return {
    provider: 'warezcdn',
    success: false,
    durationMs: 0,
    data: null,
    error: 'Não existe integração pública autorizada configurada.',
  };
}

export function getSuperFlixStatus(): ProviderResult<null> {
  return {
    provider: 'superflix',
    success: false,
    durationMs: 0,
    data: null,
    error: 'Não existe integração pública autorizada configurada.',
  };
}

// 11. AnimeWorld, TioAnime, MonosChinos (Verificadores de API pública / Não-Scraping)
export function checkPublicApiProvider(providerName: string): ProviderResult<null> {
  return {
    provider: providerName,
    success: false,
    durationMs: 0,
    data: null,
    error: `O provedor ${providerName} não disponibiliza API pública documentada. Scraping proibido.`,
  };
}

// Pipeline Unificado de Fallback
export async function resolveEpisodesWithFallback(
  title: string,
  aniListId?: number
): Promise<ProviderResult<NormalizedEpisode[]>> {
  // 1. AniZone / Kenjitsu
  const aniZoneRes = await getAniZoneEpisodes(title);
  if (aniZoneRes.success && aniZoneRes.data && aniZoneRes.data.length > 0) {
    return aniZoneRes;
  }

  // 2. Miruro (requer AniList ID)
  if (aniListId) {
    const miruroRes = await getMiruroEpisodes(aniListId);
    if (miruroRes.success && miruroRes.data && miruroRes.data.length > 0) {
      return miruroRes;
    }
  }

  // 3. Anify (Testa providers em fallback: zoro, animepahe, animedao)
  if (aniListId) {
    const providers: ('zoro' | 'animepahe' | 'animedao')[] = ['zoro', 'animepahe', 'animedao'];
    for (const prov of providers) {
      const anifyRes = await getAnifyEpisodes(aniListId, prov);
      if (anifyRes.success && anifyRes.data && anifyRes.data.length > 0) {
        return anifyRes;
      }
    }
  }

  // 4. Consumet / Gogoanime
  const consumetRes = await getConsumetEpisodes(title);
  if (consumetRes.success && consumetRes.data && consumetRes.data.length > 0) {
    return consumetRes;
  }

  // 5. TVmaze (apenas episódios/temporadas)
  const tvmazeRes = await getTVmazeEpisodes(title);
  if (tvmazeRes.success && tvmazeRes.data && tvmazeRes.data.length > 0) {
    return tvmazeRes;
  }

  return {
    provider: 'fallback-pipeline',
    success: false,
    durationMs: 0,
    data: null,
    error: 'Nenhum provedor retornou episódios válidos.',
  };
}
