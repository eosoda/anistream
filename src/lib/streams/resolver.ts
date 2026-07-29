import { AnimeProvider } from '../providers/provider.interface';
import { LocalDatabaseProvider } from '../providers/local-database.provider';
import { ConfiguredJsonProvider } from '../providers/configured-json.provider';
import { AuthorizedM3uProvider } from '../providers/authorized-m3u.provider';
import {
  EpisodeLookupInput,
  ResolveStreamResult,
  StreamSource,
  ProviderAttempt,
} from './types';
import { validateStreamSource } from './validator';

import { ExternalApisProvider } from '../providers/external-apis.provider';

export class StreamResolver {
  private providers: AnimeProvider[] = [];

  constructor(customProviders?: AnimeProvider[]) {
    if (customProviders && customProviders.length > 0) {
      this.providers = customProviders;
    } else {
      // Registrar provedores padrão autorizados
      this.providers = [
        new ExternalApisProvider(),
        new LocalDatabaseProvider(),
        new ConfiguredJsonProvider(),
        new AuthorizedM3uProvider(),
      ];
    }
  }

  public registerProvider(provider: AnimeProvider): void {
    this.providers.push(provider);
  }

  async resolveEpisodeStream(
    input: EpisodeLookupInput,
    timeoutPerProviderMs = 4000
  ): Promise<ResolveStreamResult> {
    const attempts: ProviderAttempt[] = [];
    const rawSourcesMap = new Map<string, StreamSource>();

    // 1. Consultar provedores autorizados em paralelo com Promise.allSettled
    const providerPromises = this.providers.map(async (provider) => {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeoutPerProviderMs
      );

      try {
        const sources = await provider.getEpisodeSources(
          input,
          controller.signal
        );
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        attempts.push({
          provider: provider.id,
          success: true,
          durationMs,
          sourceCount: sources.length,
        });

        return sources;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        attempts.push({
          provider: provider.id,
          success: false,
          durationMs,
          sourceCount: 0,
          error:
            err.name === 'AbortError'
              ? `Timeout de ${timeoutPerProviderMs}ms excedido`
              : err.message,
        });

        return [];
      }
    });

    const results = await Promise.allSettled(providerPromises);

    // 2. Coletar todas as fontes dos provedores bem-sucedidos
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        for (const source of result.value) {
          // Deduplicar por URL
          if (!rawSourcesMap.has(source.url)) {
            rawSourcesMap.set(source.url, source);
          }
        }
      }
    }

    const allSources = Array.from(rawSourcesMap.values());

    // 3. Validar fontes em servidor (HLS manifest / MP4 byte range)
    const validSources: { source: StreamSource; latencyMs: number }[] = [];

    const validationPromises = allSources.map(async (source) => {
      const validation = await validateStreamSource(source, 3500);
      if (validation.valid) {
        validSources.push({
          source,
          latencyMs: validation.latencyMs,
        });
      }
    });

    await Promise.allSettled(validationPromises);

    // 4. Ordenar fontes conforme as regras estritas
    const preferredAudio = input.preferredAudio || 'pt-BR';

    const sortedSources = validSources
      .map(({ source, latencyMs }) => ({
        source,
        latencyMs,
        score: calculateSourceScore(source, latencyMs, preferredAudio),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.source);

    const selected = sortedSources.length > 0 ? sortedSources[0] : null;
    const alternatives = sortedSources.length > 1 ? sortedSources.slice(1) : [];

    return {
      selected,
      alternatives,
      attempts,
    };
  }
}

/**
 * Calcula a pontuação de relevância e prioridade da fonte de vídeo:
 * 1. Idioma solicitado (peso +1000)
 * 2. Resolução (1080p: +500, 720p: +300, 480p: +100)
 * 3. HLS antes de MP4 (+200)
 * 4. Prioridade administrativa (+prioridade * 10)
 * 5. Menor latência (subtrai latência)
 */
function calculateSourceScore(
  source: StreamSource,
  latencyMs: number,
  preferredAudio: string
): number {
  let score = 0;

  // 1. Idioma preferido
  if (source.audioLanguage === preferredAudio) {
    score += 1000;
  } else if (source.audioLanguage === 'pt-BR') {
    score += 500;
  } else if (source.audioLanguage === 'ja') {
    score += 300;
  }

  // 2. Qualidade / Resolução
  const q = (source.quality || '').toLowerCase();
  if (q.includes('1080') || source.height === 1080) {
    score += 500;
  } else if (q.includes('720') || source.height === 720) {
    score += 300;
  } else if (q.includes('480') || source.height === 480) {
    score += 100;
  }

  // 3. Tipo de Stream (HLS sobre MP4)
  if (source.type === 'hls') {
    score += 200;
  }

  // 4. Prioridade administrativa
  score += (source.priority || 0) * 10;

  // 5. Penalidade por latência maior (máx 100 pontos de dedução)
  const latencyPenalty = Math.min(100, Math.floor(latencyMs / 20));
  score -= latencyPenalty;

  return score;
}

export const defaultStreamResolver = new StreamResolver();
