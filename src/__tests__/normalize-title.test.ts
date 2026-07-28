import { describe, it, expect } from 'vitest';
import { normalizeAnimeTitle } from '../lib/anime/normalize-title';

describe('normalizeAnimeTitle', () => {
  it('deve remover acentos e converter para minúsculas', () => {
    const result = normalizeAnimeTitle('Jujutsu Kaisen 2ª Temporada — Dublado');
    expect(result).toBe('jujutsu kaisen 2 temporada');
  });

  it('deve tratar numerais romanos básicos', () => {
    const result = normalizeAnimeTitle('Mob Psycho 100 II');
    expect(result).toBe('mob psycho 100 2');
  });

  it('deve remover termos de dublagem e legendas', () => {
    const result = normalizeAnimeTitle('Attack on Titan Season 4 Part 2 [Legendado]');
    expect(result).toBe('attack on titan season 4 part 2');
  });
});
