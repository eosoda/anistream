import { AnimeProvider } from './provider.interface';
import { EpisodeLookupInput, StreamSource, ProviderHealth } from '../streams/types';
import { prisma } from '../db/prisma';
import {
  getAniZoneSources,
  getMiruroSources,
  getAnifySources,
  getConsumetSources,
  get2EmbedUrl,
  getXpassEmbedUrl,
  getApiPlayerEmbedUrl,
} from '@/services/providers/externalProviders';

export class ExternalApisProvider implements AnimeProvider {
  readonly id = 'external-apis';
  readonly name = 'Provedores de APIs e Embeds Externos';

  async getEpisodeSources(
    input: EpisodeLookupInput,
    signal?: AbortSignal
  ): Promise<StreamSource[]> {
    const sources: StreamSource[] = [];

    try {
      // Buscar apenas provedores ativados (enabled: true) ordenados por prioridade
      const dbProviders = await prisma.mediaProvider.findMany({
        where: {
          enabled: true,
          type: { in: ['EXTERNAL_API', 'EMBED'] },
        },
        orderBy: { priority: 'desc' },
      });

      const title = (input as any).title || input.animeId || '';
      const epNum = input.episode || (input as any).episodeNumber || 1;

      for (const p of dbProviders) {
        if (signal?.aborted) break;

        const nameLower = p.name.toLowerCase();

        // 1. AniZone
        if (nameLower.includes('anizone') || p.url.includes('anizone')) {
          const episodeSlug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-episode-${epNum}`;
          const res = await getAniZoneSources(episodeSlug);
          if (res.success && res.data) {
            for (const s of res.data) {
              sources.push({
                id: `anizone-${p.id}-${s.url}`,
                provider: 'AniZone',
                url: s.url,
                type: s.type as any,
                quality: s.quality || 'auto',
                priority: p.priority,
                audioLanguage: s.audio === 'dub' ? 'pt-BR' : 'ja',
              });
            }
          }
        }

        // 2. Miruro (se houver watchId ou id)
        else if (nameLower.includes('miruro') || p.url.includes('miruro')) {
          const watchId = `${input.animeId}-${epNum}`;
          const res = await getMiruroSources(watchId);
          if (res.success && res.data) {
            for (const s of res.data) {
              sources.push({
                id: `miruro-${p.id}-${s.url}`,
                provider: 'Miruro',
                url: s.url,
                type: s.type as any,
                quality: s.quality || 'auto',
                priority: p.priority,
              });
            }
          }
        }

        // 3. Anify
        else if (nameLower.includes('anify') || p.url.includes('anify')) {
          if (input.animeId) {
            const res = await getAnifySources('zoro', `${input.animeId}-${epNum}`);
            if (res.success && res.data) {
              for (const s of res.data) {
                sources.push({
                  id: `anify-${p.id}-${s.url}`,
                  provider: 'Anify',
                  url: s.url,
                  type: s.type as any,
                  quality: s.quality || 'auto',
                  priority: p.priority,
                });
              }
            }
          }
        }

        // 4. Consumet
        else if (nameLower.includes('consumet') || p.url.includes('consumet')) {
          const epId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-episode-${epNum}`;
          const res = await getConsumetSources(epId);
          if (res.success && res.data) {
            for (const s of res.data) {
              sources.push({
                id: `consumet-${p.id}-${s.url}`,
                provider: 'Consumet',
                url: s.url,
                type: s.type as any,
                quality: s.quality || 'auto',
                priority: p.priority,
              });
            }
          }
        }

        // 5. 2Embed
        else if (nameLower.includes('2embed') || p.url.includes('2embed')) {
          const embed = get2EmbedUrl(title, 1, epNum);
          sources.push({
            id: `2embed-${p.id}-${epNum}`,
            provider: '2Embed',
            url: embed.url,
            type: 'embed',
            quality: 'auto',
            priority: p.priority,
          });
        }

        // 6. Xpass
        else if (nameLower.includes('xpass') || p.url.includes('xpass')) {
          const tmdbId = Number(input.animeId) || 1000;
          const embed = getXpassEmbedUrl(tmdbId, 1, epNum);
          if (embed) {
            sources.push({
              id: `xpass-${p.id}-${epNum}`,
              provider: 'Xpass',
              url: embed.url,
              type: 'embed',
              quality: 'auto',
              priority: p.priority,
            });
          }
        }

        // 7. ApiPlayer
        else if (nameLower.includes('apiplayer') || p.url.includes('apiplayer')) {
          const tmdbId = Number(input.animeId) || 1000;
          const embed = getApiPlayerEmbedUrl(tmdbId, 1, epNum);
          if (embed) {
            sources.push({
              id: `apiplayer-${p.id}-${epNum}`,
              provider: 'ApiPlayer',
              url: embed.url,
              type: 'embed',
              quality: 'auto',
              priority: p.priority,
            });
          }
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
