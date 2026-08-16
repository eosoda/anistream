import dns from 'node:dns/promises';

export interface SSRFValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

export function isPrivateIp(ip: string): boolean {
  const value = ip.trim().toLowerCase().replace(/\.$/, '');
  if (value === 'localhost') return true;

  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return true;
    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 169 && second === 254) ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 192 && second === 0) ||
      (first === 198 && second >= 18 && second <= 19) ||
      (first === 198 && second === 51) ||
      (first === 203 && second === 0) ||
      first >= 224
    );
  }

  if (value.includes(':')) {
    if (value.startsWith('::ffff:')) {
      return isPrivateIp(value.slice('::ffff:'.length));
    }
    return (
      value === '::' ||
      value === '::1' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fe8') ||
      value.startsWith('fe9') ||
      value.startsWith('fea') ||
      value.startsWith('feb') ||
      value.startsWith('ff') ||
      value.startsWith('2001:db8:')
    );
  }

  return false;
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
