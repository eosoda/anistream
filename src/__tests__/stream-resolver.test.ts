import { describe, expect, it, vi } from 'vitest';
import { StreamResolver } from '../lib/streams/resolver';
import type { AnimeProvider } from '../lib/providers/provider.interface';
import type { EpisodeLookupInput, StreamSource } from '../lib/streams/types';

vi.mock('../lib/streams/validator', () => ({
  validateStreamSource: vi.fn(async (source: StreamSource) => ({
    valid: true,
    type: source.type,
    status: 200,
    latencyMs: 1,
  })),
}));

const input: EpisodeLookupInput = {
  animeId: '52299',
  season: 1,
  episode: 1,
  animeTitle: 'Frieren',
  aliases: ['Sousou no Frieren'],
  resolutionMode: 'fast',
};

function source(id: string, provider: string, quality = '720p'): StreamSource {
  return {
    id,
    provider,
    url: `https://cdn.example.com/${id}.m3u8`,
    type: 'hls',
    quality,
    requiresProxy: true,
  };
}

function provider(id: string, sources: StreamSource[], delayMs = 0): AnimeProvider {
  return {
    id,
    name: id,
    getEpisodeSources: async () => {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return sources;
    },
  };
}

describe('StreamResolver fast mode', () => {
  it('retorna a primeira fonte válida sem aguardar um provedor lento', async () => {
    const resolver = new StreamResolver([
      provider('slow', [source('slow-1', 'Slow')], 120),
      provider('fast', [source('fast-1', 'Fast')]),
    ]);

    const result = await resolver.resolveEpisodeStream(input, 1000, {
      mode: 'fast',
      validationTimeoutMs: 20,
    });

    expect(result.selected?.id).toBe('fast-1');
    expect(result.phase).toBe('fast');
    expect(result.alternativesPending).toBe(true);
  });

  it('deduplica chamadas simultâneas e reutiliza o cache por episódio', async () => {
    let calls = 0;
    const cachedProvider: AnimeProvider = {
      id: 'cached',
      name: 'Cached',
      getEpisodeSources: async () => {
        calls += 1;
        return [source('cached-1', 'Cached')];
      },
    };
    const resolver = new StreamResolver([cachedProvider]);

    const [first, second] = await Promise.all([
      resolver.resolveEpisodeStream(input, 1000, { mode: 'fast', validationTimeoutMs: 20 }),
      resolver.resolveEpisodeStream(input, 1000, { mode: 'fast', validationTimeoutMs: 20 }),
    ]);

    expect(first.selected?.id).toBe('cached-1');
    expect(second.selected?.id).toBe('cached-1');
    expect(calls).toBe(1);
    expect(second.cacheHit).toBe(true);
  });
});
