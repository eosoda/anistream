import { AnimeProvider } from './provider.interface';
import { EpisodeLookupInput, StreamSource, ProviderHealth } from '../streams/types';
import { prisma } from '../db/prisma';
import {
  getAniZoneSources,
  getGogoAnimeConsumetSources,
  getZoroConsumetSources,
  getAnifySources,
  getAnimesOnlineSources,
  getWarezCDNSources,
  getXPass2EmbedSources,
} from '@/services/providers/externalProviders';
import { validateHlsPlaylist } from '../streams/hls-validator';
import { normalizeAnimeTitle } from '../anime/normalize-title';
import {
  getAnimeSdkProviderKey,
  resolveAnimeSdkSources,
} from './anime-sdk';
import {
  getConsumetProviderKey,
  resolveConsumetSources,
} from './consumet';

async function resolveEmbedCatalogId(
  input: EpisodeLookupInput,
  title: string
): Promise<string | null> {
  try {
    const anime = await prisma.anime.findFirst({
      where: {
        OR: [
          { id: input.animeId },
          { slug: input.animeId },
          { identifiers: { some: { value: input.animeId } } },
        ],
      },
      include: { identifiers: true },
    });
    const stored = anime?.identifiers.find((identifier: { provider: string }) =>
      ['imdb', 'tmdb'].includes(identifier.provider.toLowerCase())
    );
    if (stored?.value) return stored.value;
  } catch {
    // O catálogo público pode funcionar mesmo sem um registro local.
  }

  if (!title) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`,
      { signal: controller.signal, cache: 'no-store' }
    );
    clearTimeout(timeout);
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{
      show?: {
        name?: string;
        externals?: { imdb?: string | null };
      };
    }>;
    const normalizedCandidates = new Set(
      [title, input.originalTitle, ...(input.aliases || [])]
        .filter((value): value is string => Boolean(value))
        .map(normalizeAnimeTitle)
    );
    const exact = results.find((result) =>
      result.show?.name
        ? normalizedCandidates.has(normalizeAnimeTitle(result.show.name))
        : false
    );
    return exact?.show?.externals?.imdb || results[0]?.show?.externals?.imdb || null;
  } catch {
    return null;
  }
}

export class ExternalApisProvider implements AnimeProvider {
  readonly id = 'external-apis';
  readonly name = 'Provedores de APIs e Embeds Externos';

  async getEpisodeSources(
    input: EpisodeLookupInput,
    signal?: AbortSignal
  ): Promise<StreamSource[]> {
    const sources: StreamSource[] = [];

    try {
      // Buscar apenas provedores ativados (enabled: true) no banco, ordenados por prioridade
      const dbProviders = await prisma.mediaProvider.findMany({
        where: {
          enabled: true,
          type: { in: ['ANIME_SDK', 'CONSUMET', 'EXTERNAL_API', 'EMBED'] },
          ...(input.preferredProvider
            ? { name: { equals: input.preferredProvider, mode: 'insensitive' as const } }
            : {}),
        },
        orderBy: { priority: 'desc' },
      });
      // Embeds são resolvidos localmente e devem entrar na lista antes das APIs
      // de scraping, que podem consumir todo o orçamento de timeout.
      dbProviders.sort((
        a: { type: string; priority: number },
        b: { type: string; priority: number }
      ) => {
        const typeWeight = (provider: { type: string }) =>
          ['ANIME_SDK', 'CONSUMET'].includes(provider.type)
            ? 2
            : provider.type === 'EMBED'
              ? 1
              : 0;
        return typeWeight(b) - typeWeight(a) || b.priority - a.priority;
      });

      const title = input.animeTitle || (input as any).title || input.animeId || '';
      const epNum = input.episode || (input as any).episodeNumber || 1;
      const seasonNum = input.season || 1;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const needsEmbedId = dbProviders.some(
        (provider: { type: string }) => provider.type === 'EMBED'
      );
      const embedCatalogId = needsEmbedId
        ? await resolveEmbedCatalogId(input, title)
        : null;

      const sdkProviders = dbProviders.filter(
        (provider: { type: string }) =>
          provider.type === 'ANIME_SDK' || provider.type === 'CONSUMET'
      );
      const sdkResults = await Promise.allSettled(
        sdkProviders.map(
          async (provider: { name: string; priority: number; type: string }) => {
            if (provider.type === 'CONSUMET') {
              const key = getConsumetProviderKey(provider.name);
              return key
                ? resolveConsumetSources(key, input, provider.priority, signal)
                : [];
            }
            const key = getAnimeSdkProviderKey(provider.name);
            return key
              ? resolveAnimeSdkSources(key, input, provider.priority, signal)
              : [];
          }
        )
      );
      for (const result of sdkResults) {
        if (result.status === 'fulfilled') sources.push(...result.value);
      }

      for (const p of dbProviders) {
        if (signal?.aborted) break;
        if (p.type === 'ANIME_SDK' || p.type === 'CONSUMET') continue;

        try {
          const nameLower = p.name.toLowerCase();

          // 1. Kenjitsu / AniZone
          if (nameLower.includes('anizone') || nameLower.includes('kenjitsu')) {
            const resSub = await getAniZoneSources(slug, epNum, false);
            if (resSub.success && resSub.data) {
              for (const s of resSub.data) {
                sources.push({
                  id: `anizone-${p.id}-${s.url}`,
                  provider: 'Kenjitsu / AniZone',
                  url: s.url,
                  type: s.type as any,
                  quality: s.quality || 'Auto',
                  priority: p.priority,
                  audioLanguage: 'ja',
                  headers: s.headers,
                });
              }
            }

            const resDub = await getAniZoneSources(slug, epNum, true);
            if (resDub.success && resDub.data) {
              for (const s of resDub.data) {
                sources.push({
                  id: `anizone-dub-${p.id}-${s.url}`,
                  provider: 'Kenjitsu / AniZone (Dublado)',
                  url: s.url,
                  type: s.type as any,
                  quality: s.quality || 'Auto',
                  priority: p.priority,
                  audioLanguage: 'pt-BR',
                  headers: s.headers,
                });
              }
            }
          }

          // 2. GogoAnime (Consumet 5 Instâncias Fallback)
          else if (nameLower.includes('gogoanime') || nameLower.includes('consumet')) {
            const res = await getGogoAnimeConsumetSources(title, epNum, 'sub');
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `gogoanime-${p.id}-${s.url}`,
                  provider: 'GogoAnime',
                  url: s.url,
                  type: s.type as any,
                  quality: s.quality || 'Auto',
                  priority: p.priority,
                  audioLanguage: 'ja',
                  headers: s.headers,
                });
              }
            }
          }

          // 3. HiAnime / Zoro
          else if (nameLower.includes('hianime') || nameLower.includes('zoro')) {
            const res = await getZoroConsumetSources(title, epNum, 'sub');
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `zoro-${p.id}-${s.url}`,
                  provider: 'HiAnime / Zoro',
                  url: s.url,
                  type: s.type as any,
                  quality: s.quality || 'Auto',
                  priority: p.priority,
                  audioLanguage: 'ja',
                  headers: s.headers,
                });
              }
            }
          }

          // 4. Anify
          else if (nameLower.includes('anify')) {
            const malIdNum = parseInt(input.animeId, 10);
            if (!isNaN(malIdNum)) {
              const res = await getAnifySources(malIdNum, 'zoro', false);
              if (res.success && res.data) {
                for (const s of res.data) {
                  sources.push({
                    id: `anify-${p.id}-${s.url}`,
                    provider: 'Anify',
                    url: s.url,
                    type: s.type as any,
                    quality: s.quality || 'Auto',
                    priority: p.priority,
                    audioLanguage: 'ja',
                    headers: s.headers,
                  });
                }
              }
            }
          }

          // 5. AnimesOnline Scraper
          else if (nameLower.includes('animesonline')) {
            const res = await getAnimesOnlineSources(title, epNum);
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `animesonline-${p.id}-${s.url}`,
                  provider: 'AnimesOnline',
                  url: s.url,
                  type: 'embed',
                  quality: '1080p',
                  priority: p.priority,
                  audioLanguage: 'pt-BR',
                  headers: s.headers,
                });
              }
            }
          }

          // 6. WarezCDN / Superflix
          else if (nameLower.includes('warezcdn') || nameLower.includes('superflix')) {
            if (!embedCatalogId) continue;
            const res = await getWarezCDNSources(embedCatalogId, seasonNum, epNum);
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `warez-${p.id}-${s.url}`,
                  provider: 'WarezCDN / Superflix',
                  url: s.url,
                  type: 'embed',
                  quality: '1080p',
                  priority: p.priority,
                  audioLanguage: 'pt-BR',
                  headers: s.headers,
                });
              }
            }
          }

          // 7. XPass / 2Embed
          else if (nameLower.includes('xpass') || nameLower.includes('2embed')) {
            if (!embedCatalogId) continue;
            const res = await getXPass2EmbedSources(embedCatalogId, seasonNum, epNum, title);
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `xpass-${p.id}-${s.url}`,
                  provider: s.provider,
                  url: s.url,
                  type: s.type as any,
                  quality: '1080p',
                  priority: p.priority,
                  audioLanguage: 'ja',
                  headers: s.headers,
                  requiresProxy: true,
                });
              }
            }
          }
        } catch (providerErr: any) {
          console.warn(`[ExternalApisProvider] Falha ao consultar o provedor "${p.name}":`, providerErr.message);
        }
      }
    } catch (err) {
      console.error('Erro ao consultar provedores externos:', err);
    }

    // Páginas embed de terceiros executam JavaScript publicitário e podem
    // tentar abrir popups. No fluxo público aceitamos somente mídia direta,
    // reproduzida pelo player nativo através do relay assinado.
    return sources.filter((source) => source.type !== 'embed');
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      name: this.name,
      status: 'healthy',
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
    };
  }
}
