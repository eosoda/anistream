import dns from 'node:dns/promises';
import { isAuthorizedHost, isLegacyHostBlocked } from './allowed-hosts';

const PRIVATE_IP_RANGES = [
  // Loopback & Local
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^localhost$/i,
  // Class A private
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // Class B private
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  // Class C private
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  // Link-local / AWS metadata
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  // CGNAT
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  // Multicast
  /^(22[4-9]|23\d)\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv6 Loopback & Private
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export interface SSRFValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(ip));
}

export async function validateUrlSsrf(
  urlString: string
): Promise<SSRFValidationResult> {
  try {
    const parsedUrl = new URL(urlString);

    // 1. Validar protocolo
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        valid: false,
        reason: `Protocolo não permitido: ${parsedUrl.protocol}`,
      };
    }

    // 2. Bloquear credenciais embutidas (ex: http://user:pass@host)
    if (parsedUrl.username || parsedUrl.password) {
      return {
        valid: false,
        reason: 'URLs com credenciais embutidas são proibidas',
      };
    }

    // 3. Validar portas permitidas
    const port = parsedUrl.port
      ? parseInt(parsedUrl.port, 10)
      : parsedUrl.protocol === 'https:'
      ? 443
      : 80;

    const ALLOWED_PORTS = [80, 443, 8080, 8443];
    if (!ALLOWED_PORTS.includes(port)) {
      return {
        valid: false,
        reason: `Porta não permitida: ${port}`,
      };
    }

    const hostname = parsedUrl.hostname;

    // 4. Bloquear hosts legados explicitamente
    if (isLegacyHostBlocked(hostname)) {
      return {
        valid: false,
        reason: `Host legado não autorizado: ${hostname}`,
      };
    }

    // 5. Verificar IP privado direto no hostname
    if (isPrivateIp(hostname)) {
      return {
        valid: false,
        reason: `Tentativa de acesso a IP privado ou reservado: ${hostname}`,
      };
    }

    // 6. Resolução DNS prévia para prevenir DNS Rebinding
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateIp(addr.address)) {
          return {
            valid: false,
            reason: `Hostname ${hostname} resolveu para IP privado: ${addr.address}`,
          };
        }
      }
      const firstIp = addresses[0]?.address;

      // 7. Verificar se o host está na allowlist de mídia autorizada
      if (!isAuthorizedHost(hostname)) {
        return {
          valid: false,
          reason: `Host ${hostname} não está na lista de hosts autorizados`,
        };
      }

      return {
        valid: true,
        resolvedIp: firstIp,
      };
    } catch (dnsErr) {
      return {
        valid: false,
        reason: `Falha na resolução de DNS para ${hostname}: ${(dnsErr as Error).message}`,
      };
    }
  } catch (urlErr) {
    return {
      valid: false,
      reason: `URL malformada ou inválida: ${(urlErr as Error).message}`,
    };
  }
}
