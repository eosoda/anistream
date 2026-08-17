export function formatSeasonName(season: string | null | undefined): string {
  if (!season) return '—';
  const s = season.toLowerCase();
  switch (s) {
    case 'spring':
      return 'Primavera';
    case 'summer':
      return 'Verão';
    case 'fall':
    case 'autumn':
      return 'Outono';
    case 'winter':
      return 'Inverno';
    default:
      return season.charAt(0).toUpperCase() + season.slice(1);
  }
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Desconhecido';
  if (status.includes('Currently Airing')) return 'Em Exibição';
  if (status.includes('Finished Airing')) return 'Concluído';
  if (status.includes('Not yet aired')) return 'Em Breve';
  return status;
}

export function formatSource(source: string | null | undefined): string {
  if (!source) return 'Original';
  switch (source.toLowerCase()) {
    case 'manga':
      return 'Mangá';
    case 'light_novel':
    case 'light novel':
      return 'Light Novel';
    case 'visual_novel':
    case 'visual novel':
      return 'Visual Novel';
    case 'original':
      return 'Original';
    case 'game':
      return 'Jogo';
    case 'web_manga':
    case 'web manga':
      return 'Web Manga';
    case 'novel':
      return 'Novel';
    default:
      return source;
  }
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatRating(rating: string | null | undefined): string {
  if (!rating) return 'Livre';
  if (rating.includes('PG-13')) return '13+';
  if (rating.includes('R - 17+')) return '17+';
  if (rating.includes('R+')) return '18+';
  if (rating.includes('PG')) return '10+';
  if (rating.includes('G')) return 'Livre';
  return rating;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  ldquo: '“',
  ldquor: '„',
  lsquo: '‘',
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
  lt: '<',
  cent: '¢',
  copy: '©',
  deg: '°',
  divide: '÷',
  eacute: 'é',
  laquo: '«',
  micro: 'µ',
  plusmn: '±',
  raquo: '»',
  reg: '®',
  times: '×',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, token: string) => {
    const normalizedToken = token.toLowerCase();
    if (normalizedToken.startsWith('#x') || normalizedToken.startsWith('#')) {
      const hexadecimal = normalizedToken.startsWith('#x');
      const codePoint = Number.parseInt(normalizedToken.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return '';
      return String.fromCodePoint(codePoint);
    }
    return HTML_ENTITIES[normalizedToken] ?? entity;
  });
}

function removeUnpairedSurrogates(value: string): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    result += value[index];
  }
  return result;
}

function decodeRepeatedly(value: string): string {
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = decodeHtmlEntities(current);
    if (decoded === current) break;
    current = decoded;
  }
  return current;
}

/**
 * Converts HTML-ish descriptions from providers and legacy records to text.
 * Block boundaries are kept as line breaks, while formatting tags themselves
 * are intentionally discarded so callers never need dangerouslySetInnerHTML.
 */
export function toPlainText(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;

  const withDecodedEntities = decodeRepeatedly(removeUnpairedSurrogates(value.replace(/\r\n?/g, '\n')));
  const withLineBreaks = withDecodedEntities
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(?:li)\s*>/gi, '')
    .replace(/<\/(?:ul|ol)\s*>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|blockquote|ul|ol|h[1-6])\s*>/gi, '\n\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, '');

  const normalized = decodeRepeatedly(withLineBreaks)
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized || null;
}
