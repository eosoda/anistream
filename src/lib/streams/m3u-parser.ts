import { normalizeAnimeTitle } from '../anime/normalize-title';

export interface ParsedM3uItem {
  rawTitle: string;
  normalizedTitle: string;
  detectedSeason: number;
  detectedEpisode: number;
  logoUrl?: string;
  groupTitle?: string;
  streamUrl: string;
}

export function parseM3uContent(m3uText: string): ParsedM3uItem[] {
  const lines = m3uText.split(/\r?\n/);
  const items: ParsedM3uItem[] = [];

  let currentExtInf: {
    title: string;
    logoUrl?: string;
    groupTitle?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const attributes = parseExtInfAttributes(line);
      const titleMatch = line.match(/,(.+)$/);
      const title = titleMatch ? titleMatch[1].trim() : 'Sem Título';

      currentExtInf = {
        title,
        logoUrl: attributes['tvg-logo'],
        groupTitle: attributes['group-title'],
      };
    } else if (line.length > 0 && !line.startsWith('#')) {
      // É uma URL de stream
      if (currentExtInf) {
        const { detectedSeason, detectedEpisode, cleanTitle } =
          extractSeasonAndEpisode(currentExtInf.title);

        items.push({
          rawTitle: currentExtInf.title,
          normalizedTitle: normalizeAnimeTitle(cleanTitle),
          detectedSeason,
          detectedEpisode,
          logoUrl: currentExtInf.logoUrl,
          groupTitle: currentExtInf.groupTitle,
          streamUrl: line,
        });

        currentExtInf = null;
      }
    }
  }

  return items;
}

function parseExtInfAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

export function extractSeasonAndEpisode(title: string): {
  detectedSeason: number;
  detectedEpisode: number;
  cleanTitle: string;
} {
  let season = 1;
  let episode = 1;
  let cleanTitle = title;

  // 1. Padrão S01E01 / S1E1 / s02e12
  const sEPattern = /S(\d+)\s*E(\d+)/i;
  const sEMatch = title.match(sEPattern);

  if (sEMatch) {
    season = parseInt(sEMatch[1], 10);
    episode = parseFloat(sEMatch[2]);
    cleanTitle = title.replace(sEPattern, '').trim();
    return { detectedSeason: season, detectedEpisode: episode, cleanTitle };
  }

  // 2. Padrão 1x01 / 2x12
  const xPattern = /(\d+)x(\d+)/i;
  const xMatch = title.match(xPattern);

  if (xMatch) {
    season = parseInt(xMatch[1], 10);
    episode = parseFloat(xMatch[2]);
    cleanTitle = title.replace(xPattern, '').trim();
    return { detectedSeason: season, detectedEpisode: episode, cleanTitle };
  }

  // 3. Padrão Episódio 01 / Episode 01 / Ep 01 / EP. 01
  const epPattern = /(?:episodio|episódio|episode|ep\.?)\s*(\d+)/i;
  const epMatch = title.match(epPattern);

  if (epMatch) {
    episode = parseFloat(epMatch[1]);
    cleanTitle = title.replace(epPattern, '').trim();
  } else {
    // 4. Fallback: procurar número isolado no final da string (ex: "Jujutsu Kaisen 12")
    const lastNumMatch = title.match(/\b(\d+)\b$/);
    if (lastNumMatch) {
      episode = parseFloat(lastNumMatch[1]);
      cleanTitle = title.replace(/\b(\d+)\b$/, '').trim();
    }
  }

  return { detectedSeason: season, detectedEpisode: episode, cleanTitle };
}
