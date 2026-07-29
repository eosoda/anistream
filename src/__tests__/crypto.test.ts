import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../lib/security/crypto';

describe('crypto security utility', () => {
  it('deve criptografar e descriptografar texto plano com AES-256-GCM', () => {
    const plainText = 'https://media.mydomain.com/streams/secret-hls.m3u8';
    const encrypted = encryptData(plainText);

    expect(encrypted).not.toBe(plainText);
    expect(encrypted).toContain(':');

    const decrypted = decryptData(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('deve retornar texto plano caso a string não esteja no formato criptografado esperados', () => {
    const rawUrl = 'https://example.com/stream.mp4';
    const result = decryptData(rawUrl);
    expect(result).toBe(rawUrl);
  });

  it('deve lidar graciosamente com valores nulos ou vazios', () => {
    expect(encryptData('')).toBe('');
    expect(decryptData('')).toBe('');
  });
});
