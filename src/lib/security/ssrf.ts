import dns from 'node:dns/promises';

const PRIVATE_IP_RANGES = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^localhost$/i,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  /^(22[4-9]|23\d)\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^::1$/i,
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

/**
 * Valida uma URL externa sem depender de uma allowlist administrativa.
 * O Kenjitsu retorna CDNs e hosts efêmeros; a fronteira de segurança aqui
 * continua sendo protocolo, porta, credenciais, DNS e redes privadas.
 */
export async function validateUrlSsrf(urlString: string): Promise<SSRFValidationResult> {
  try {
    const parsedUrl = new URL(urlString);

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, reason: `Protocolo não permitido: ${parsedUrl.protocol}` };
    }

    if (parsedUrl.username || parsedUrl.password) {
      return { valid: false, reason: 'URLs com credenciais embutidas são proibidas' };
    }

    const port = parsedUrl.port
      ? parseInt(parsedUrl.port, 10)
      : parsedUrl.protocol === 'https:'
        ? 443
        : 80;
    if (![80, 443, 8080, 8443].includes(port)) {
      return { valid: false, reason: `Porta não permitida: ${port}` };
    }

    const hostname = parsedUrl.hostname;
    if (isPrivateIp(hostname)) {
      return { valid: false, reason: `Tentativa de acesso a IP privado ou reservado: ${hostname}` };
    }

    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const address of addresses) {
        if (isPrivateIp(address.address)) {
          return { valid: false, reason: `Hostname ${hostname} resolveu para IP privado: ${address.address}` };
        }
      }

      return { valid: true, resolvedIp: addresses[0]?.address };
    } catch (error) {
      return {
        valid: false,
        reason: `Falha na resolução de DNS para ${hostname}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      reason: `URL malformada ou inválida: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
    };
  }
}
