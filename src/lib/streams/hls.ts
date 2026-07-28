export interface HlsVariant {
  bandwidth: number;
  resolution?: string;
  width?: number;
  height?: number;
  codecs?: string;
  uri: string;
}

export interface HlsMediaTrack {
  type: 'AUDIO' | 'SUBTITLES';
  groupId: string;
  name: string;
  language?: string;
  uri?: string;
  default?: boolean;
}

export interface HlsManifestDetails {
  isMasterPlaylist: boolean;
  variants: HlsVariant[];
  mediaTracks: HlsMediaTrack[];
}

export function parseHlsManifest(content: string, baseUrl: string): HlsManifestDetails {
  const lines = content.split(/\r?\n/);
  const isMasterPlaylist = content.includes('#EXT-X-STREAM-INF');

  const variants: HlsVariant[] = [];
  const mediaTracks: HlsMediaTrack[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse #EXT-X-MEDIA (Áudio ou Legendas)
    if (line.startsWith('#EXT-X-MEDIA:')) {
      const attributes = parseHlsAttributes(line.substring(13));
      const type = attributes['TYPE'] as 'AUDIO' | 'SUBTITLES';
      if (type === 'AUDIO' || type === 'SUBTITLES') {
        mediaTracks.push({
          type,
          groupId: attributes['GROUP-ID'] || '',
          name: attributes['NAME'] || '',
          language: attributes['LANGUAGE'],
          uri: attributes['URI'] ? resolveUrl(attributes['URI'], baseUrl) : undefined,
          default: attributes['DEFAULT'] === 'YES',
        });
      }
    }

    // Parse #EXT-X-STREAM-INF (Variantes de Resolução/Bitrate)
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attributes = parseHlsAttributes(line.substring(18));
      const bandwidth = parseInt(attributes['BANDWIDTH'] || '0', 10);
      const resolution = attributes['RESOLUTION'];
      let width: number | undefined;
      let height: number | undefined;

      if (resolution && resolution.includes('x')) {
        const [w, h] = resolution.split('x').map((v) => parseInt(v, 10));
        width = w;
        height = h;
      }

      // A linha seguinte é o URI da variante
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        variants.push({
          bandwidth,
          resolution,
          width,
          height,
          codecs: attributes['CODECS'],
          uri: resolveUrl(nextLine, baseUrl),
        });
      }
    }
  }

  return {
    isMasterPlaylist,
    variants,
    mediaTracks,
  };
}

function parseHlsAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    attrs[key] = value;
  }

  return attrs;
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}
