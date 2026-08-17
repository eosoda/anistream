import dns from 'node:dns/promises';
import net from 'node:net';

export interface SSRFValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

function parseIpv4(value: string): number[] | null {
  const octets = value.split('.');
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) return null;
  const parsed = octets.map(Number);
  return parsed.every((octet) => octet >= 0 && octet <= 255) ? parsed : null;
}

function parseIpv6(value: string): number[] | null {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized || normalized.includes('%')) return null;

  let address = normalized;
  if (address.includes('.')) {
    const separator = address.lastIndexOf(':');
    const ipv4 = parseIpv4(address.slice(separator + 1));
    if (separator < 0 || !ipv4) return null;
    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    address = `${address.slice(0, separator)}:${high}:${low}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if ([...left, ...right].some((part) => !/^[\da-f]{1,4}$/.test(part))) return null;

  const missing = 8 - left.length - right.length;
  if (halves.length === 1 && missing !== 0) return null;
  if (halves.length === 2 && missing < 1) return null;
  return [
    ...left.map((part) => Number.parseInt(part, 16)),
    ...(halves.length === 2 ? Array.from({ length: missing }, () => 0) : []),
    ...right.map((part) => Number.parseInt(part, 16)),
  ];
}

function hasIpv6Prefix(groups: number[], prefix: number[], bits: number): boolean {
  const wholeGroups = Math.floor(bits / 16);
  const remainingBits = bits % 16;
  for (let index = 0; index < wholeGroups; index += 1) {
    if (groups[index] !== (prefix[index] ?? 0)) return false;
  }
  if (remainingBits === 0) return true;
  const mask = (0xffff << (16 - remainingBits)) & 0xffff;
  return (groups[wholeGroups] & mask) === ((prefix[wholeGroups] ?? 0) & mask);
}

function ipv4FromMappedIpv6(groups: number[]): string | null {
  if (groups.length !== 8 || !groups.slice(0, 5).every((group) => group === 0) || groups[5] !== 0xffff) return null;
  return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join('.');
}

function isPrivateIpv4(value: string): boolean {
  const octets = parseIpv4(value);
  if (!octets) return true;
  const [first, second, third] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && second >= 18 && second <= 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

/** Returns true for local, private, link-local, multicast, documentation and reserved addresses. */
export function isPrivateIp(ip: string): boolean {
  const value = ip.trim().toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (value === 'localhost') return true;

  if (net.isIP(value) === 4) return isPrivateIpv4(value);
  if (net.isIP(value) !== 6) return false;

  const groups = parseIpv6(value);
  if (!groups) return true;
  const mappedIpv4 = ipv4FromMappedIpv6(groups);
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  const allZero = groups.every((group) => group === 0);
  const loopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  return (
    allZero ||
    loopback ||
    hasIpv6Prefix(groups, [0xfc00], 7) ||
    hasIpv6Prefix(groups, [0xfe80], 10) ||
    hasIpv6Prefix(groups, [0xff00], 8) ||
    hasIpv6Prefix(groups, [0x2001, 0x0db8], 32) ||
    hasIpv6Prefix(groups, [0x2001, 0x0002], 48) ||
    hasIpv6Prefix(groups, [0x2001, 0x0010], 28) ||
    hasIpv6Prefix(groups, [0x3fff], 20) ||
    hasIpv6Prefix(groups, [0x100], 64)
  );
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

/** Resolve and validate every DNS address; safeFetch calls this for each redirect. */
export async function validateUrlSsrf(urlString: string): Promise<SSRFValidationResult> {
  try {
    const parsedUrl = new URL(urlString);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, reason: 'Protocolo não permitido' };
    }
    if (parsedUrl.username || parsedUrl.password) {
      return { valid: false, reason: 'URLs com credenciais embutidas são proibidas' };
    }

    const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : parsedUrl.protocol === 'https:' ? 443 : 80;
    if (![80, 443, 8080, 8443].includes(port)) {
      return { valid: false, reason: 'Porta externa não permitida' };
    }

    const hostname = normalizeHostname(parsedUrl.hostname);
    if (!hostname || hostname === 'localhost' || isPrivateIp(hostname)) {
      return { valid: false, reason: 'Destino local ou reservado bloqueado' };
    }

    if (net.isIP(hostname)) return { valid: true, resolvedIp: hostname };

    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((address) => isPrivateIp(address.address))) {
      return { valid: false, reason: 'O hostname resolve para uma rede privada ou reservada' };
    }
    return { valid: true, resolvedIp: addresses[0]?.address };
  } catch (error) {
    console.warn('[SSRF validation]', error instanceof Error ? error.message : 'Falha desconhecida');
    return { valid: false, reason: 'URL externa inválida ou não resolvível' };
  }
}
