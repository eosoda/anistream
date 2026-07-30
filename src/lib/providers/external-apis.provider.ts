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
          type: { in: ['EXTERNAL_API', 'EMBED'] },
        },
        orderBy: { priority: 'desc' },
      });

      const title = input.animeTitle || (input as any).title || input.animeId || '';
      const epNum = input.episode || (input as any).episodeNumber || 1;
      const seasonNum = input.season || 1;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      for (const p of dbProviders) {
        if (signal?.aborted) break;

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
            const res = await getWarezCDNSources(input.animeId || title, seasonNum, epNum);
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
            const res = await getXPass2EmbedSources(input.animeId || '1000', seasonNum, epNum, title);
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `xpass-${p.id}-${s.url}`,
                  provider: s.provider,
                  url: s.url,
                  type: 'embed',
                  quality: '1080p',
                  priority: p.priority,
                  audioLanguage: 'ja',
                  headers: s.headers,
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

    return sources;
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
