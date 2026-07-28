import { describe, it, expect } from 'vitest';
import { isPrivateIp } from '../lib/security/ssrf';
import { isLegacyHostBlocked } from '../lib/security/allowed-hosts';

describe('SSRF Protection', () => {
  it('deve identificar IPs privados IPv4 e IPv6', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.0.0.5')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('172.16.0.10')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
  });

  it('deve bloquear hosts legados não autorizados', () => {
    expect(isLegacyHostBlocked('api.consumet.org')).toBe(true);
    expect(isLegacyHostBlocked('api.anify.tv')).toBe(true);
    expect(isLegacyHostBlocked('warezcdn.lat')).toBe(true);
    expect(isLegacyHostBlocked('media.mydomain.com')).toBe(false);
  });
});
