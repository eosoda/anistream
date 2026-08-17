import { describe, expect, it, vi } from 'vitest';

const mockKenjitsuClient = vi.hoisted(() => ({
  getTop: vi.fn(),
  getMetadata: vi.fn(),
}));

vi.mock('@/lib/kenjitsu/client', () => ({
  kenjitsuClient: mockKenjitsuClient,
  KenjitsuRequestError: class KenjitsuRequestError extends Error {},
}));

import { getTopAnime, mapMetaToJikan } from '@/lib/kenjitsu/catalog';

const meta = (anilistId: number, score: number | null) => ({
  anilistId,
  score,
  image: `https://images.example/${anilistId}.jpg`,
  title: { english: `Anime ${anilistId}`, romaji: `Anime ${anilistId}` },
  status: 'RELEASING',
});

describe('Kenjitsu catalog score fallback', () => {
  it('fills missing scores from details without querying items that already have one', async () => {
    mockKenjitsuClient.getTop.mockResolvedValue({
      data: [meta(1, 85), meta(2, null), meta(3, null)],
      hasNextPage: false,
    });
    mockKenjitsuClient.getMetadata.mockImplementation(async (anilistId: number) => {
      if (anilistId === 2) return { data: { ...meta(2, 87) } };
      throw new Error('detail unavailable');
    });

    const result = await getTopAnime('airing');

    expect(result.data.map((anime) => anime.score)).toEqual([8.5, 8.7, null]);
    expect(mockKenjitsuClient.getMetadata).toHaveBeenCalledTimes(2);
    expect(mockKenjitsuClient.getMetadata).toHaveBeenCalledWith(2);
    expect(mockKenjitsuClient.getMetadata).toHaveBeenCalledWith(3);
    expect(mockKenjitsuClient.getMetadata).not.toHaveBeenCalledWith(1);
  });

  it('normalizes imported metadata before exposing it to the public catalog', () => {
    const anime = mapMetaToJikan({
      ...meta(10, 82),
      title: {
        english: '<b>The &amp; Title</b>',
        romaji: '<i>Romaji Title</i>',
        native: '<span>原題</span>',
      },
      synonyms: ['<i>Alias</i>', '&amp; Another'],
      format: '<b>TV</b>',
      synopsis: '<p>First paragraph</p><p><i>Second</i><br>line</p>',
      studio: '<strong>Studio</strong>',
      producers: ['<b>Producer</b>'],
      genres: ['<i>Action</i>'],
    });

    expect(anime.title).toBe('The & Title');
    expect(anime.title_english).toBe('The & Title');
    expect(anime.title_japanese).toBe('原題');
    expect(anime.title_synonyms).toEqual(['Alias', '& Another']);
    expect(anime.type).toBe('TV');
    expect(anime.synopsis).toBe('First paragraph\n\nSecond\nline');
    expect(anime.studios[0]?.name).toBe('Studio');
    expect(anime.producers[0]?.name).toBe('Producer');
    expect(anime.genres[0]?.name).toBe('Action');
  });
});
