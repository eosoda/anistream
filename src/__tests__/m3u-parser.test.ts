import { describe, it, expect } from 'vitest';
import { parseM3uContent, extractSeasonAndEpisode } from '../lib/streams/m3u-parser';

describe('m3u-parser', () => {
  it('deve extrair temporada e episódio no formato S01E01', () => {
    const res = extractSeasonAndEpisode('Demon Slayer S02E12');
    expect(res.detectedSeason).toBe(2);
    expect(res.detectedEpisode).toBe(12);
    expect(res.cleanTitle).toBe('Demon Slayer');
  });

  it('deve extrair temporada e episódio no formato 1x05', () => {
    const res = extractSeasonAndEpisode('One Piece 1x05');
    expect(res.detectedSeason).toBe(1);
    expect(res.detectedEpisode).toBe(5);
  });

  it('deve realizar parsing completo de conteúdo M3U', () => {
    const m3uSample = `
#EXTM3U
#EXTINF:-1 tvg-logo="https://cdn.example.com/poster.jpg" group-title="Anime",Anime Exemplo S01E01
https://media.example.com/stream.m3u8
    `;

    const parsed = parseM3uContent(m3uSample);
    expect(parsed.length).toBe(1);
    expect(parsed[0].detectedSeason).toBe(1);
    expect(parsed[0].detectedEpisode).toBe(1);
    expect(parsed[0].streamUrl).toBe('https://media.example.com/stream.m3u8');
  });
});
