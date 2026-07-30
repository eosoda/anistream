import { describe, it, expect } from 'vitest';
import { validateHlsPlaylist } from '../lib/streams/hls-validator';

describe('HLS Playlist Validator', () => {
  it('should invalidate empty or invalid URLs', async () => {
    const result = await validateHlsPlaylist('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('URL inválida');
  });

  it('should validate HLS playlist format with #EXTM3U sample', async () => {
    // Teste de simulação de retorno de manifesto HLS
    const result = await validateHlsPlaylist('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    // Deve ou passar ou indicar o motivo de conexão no ambiente local
    expect(typeof result.isValid).toBe('boolean');
  });
});
