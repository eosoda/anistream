const baseUrl = (process.env.KENJITSU_SMOKE_URL || process.env.KENJITSU_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const query = process.env.KENJITSU_SMOKE_QUERY || 'Naruto';
const apiKey = process.env.KENJITSU_API_KEY || '';
const allowProbeFallback = process.env.KENJITSU_SMOKE_PROBE_FALLBACK === 'true';
const allExtensionIds = [
  'anizone', 'anikoto', 'anidb', 'anibd', 'animeheaven',
  'anikyuu', 'animefire', 'animeito', 'animeplay', 'animeplayer', 'animeq', 'animesbr', 'animescx',
  'animesdigital', 'animesdrive', 'animesgratis', 'animesonlinecc', 'animesonlinecloud',
  'animesonlinevip', 'animesroll', 'anitube', 'betteranimeio', 'dattebayobr',
  'donghuanosekai', 'goyabu', 'muitohentai',
  'pifansubs', 'smartanimes', 'sushianimes', 'tomato',
];
const nsfwExtensionIds = new Set(['muitohentai']);
const mappedExtensionIds = new Set(['anizone', 'anikoto', 'anidb', 'anibd', 'animeheaven']);
const extensionIds = process.env.KENJITSU_SMOKE_EXTENSIONS
  ? process.env.KENJITSU_SMOKE_EXTENSIONS.split(',').map(value => value.trim()).filter(Boolean)
  : allExtensionIds.filter(extensionId => process.env.KENJITSU_SMOKE_INCLUDE_NSFW === 'true' || !nsfwExtensionIds.has(extensionId));

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: apiKey ? { 'x-api-key': apiKey } : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${payload?.error || 'resposta inválida'}`);
  }
  return payload;
}

const failures = [];
const probeWarnings = [];

function comparableTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\b(?:dublado|legendado|dual audio|todos os episodios|assistir online|online|hd|hdtv|full hd)\b/g, ' ')
    .replace(/\b(?:classico|original)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const health = await getJson('/api/extensions/health');
const registeredIds = new Set((health.data || []).map(extension => extension.id));
const missingIds = allExtensionIds.filter(extensionId => !registeredIds.has(extensionId));
if (missingIds.length) {
  throw new Error(`inventário incompleto: ${missingIds.join(', ')}`);
}
console.log(`[OK] inventário: ${allExtensionIds.length} extensões registradas no Kenjitsu.`);

async function runExtensionSmoke(extensionId) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      let providerId = null;
      let usedProbe = false;
      if (mappedExtensionIds.has(extensionId)) {
        const mapping = await getJson(`/api/anilist/anime/20/mappings?provider=${encodeURIComponent(extensionId)}`);
        providerId = mapping.data?.provider?.id ?? mapping.provider?.id ?? null;
        if (providerId == null) throw new Error('nenhum mapeamento de provedor retornado');
      } else {
        const search = await getJson(`/api/extensions/${extensionId}/search?q=${encodeURIComponent(query)}`);
        const items = Array.isArray(search.data) ? search.data : [];
        const normalizedQuery = comparableTitle(query);
        const exactAnime = items.find(item =>
          [item?.name, item?.romaji]
            .filter(Boolean)
            .some(title => comparableTitle(title) === normalizedQuery),
        );
        const anime = exactAnime ?? (allowProbeFallback ? items.find(item => item?.id != null) : undefined);
        usedProbe = !exactAnime && Boolean(anime?.id);
        if (!anime?.id) throw new Error('nenhuma correspondência exata de busca');

        providerId = anime.id;
      }
      const info = await getJson(`/api/extensions/${extensionId}/anime/${encodeURIComponent(String(providerId))}`);
      const episodes = info.providerEpisodes || info.data?.providerEpisodes || [];
      const episode = episodes[0];
      if (!episode?.episodeId) throw new Error('nenhum episódio retornado');

      const sources = await getJson(
        `/api/extensions/${extensionId}/sources?episodeId=${encodeURIComponent(String(episode.episodeId))}`,
      );
      const sourceCount = Array.isArray(sources.data?.sources) ? sources.data.sources.length : 0;
      if (!sourceCount) throw new Error('nenhum source retornado');

      return { episodes: episodes.length, sources: sourceCount, attempt, usedProbe };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750));
    }
  }
  throw lastError;
}

for (const extensionId of extensionIds) {
  const startedAt = Date.now();
  try {
    const result = await runExtensionSmoke(extensionId);
    if (result.usedProbe) {
      probeWarnings.push(extensionId);
      console.warn(`[WARN] ${extensionId}: cadeia funcional via primeiro resultado; a busca não retornou correspondência exata para ${query}.`);
    } else {
      console.log(
        `[OK] ${extensionId}: ${result.episodes} episódios, ${result.sources} sources (${Date.now() - startedAt}ms, tentativa ${result.attempt})`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${extensionId}: ${message}`);
    console.error(`[FAIL] ${extensionId}: ${message}`);
  }
}

if (probeWarnings.length) {
  console.log(`Probe fallback usado em ${probeWarnings.length}: ${probeWarnings.join(', ')}.`);
}

if (failures.length) {
  console.error(`\nSmoke Kenjitsu falhou em ${failures.length}/${extensionIds.length} extensões.`);
  process.exitCode = 1;
} else {
  console.log(`\nSmoke Kenjitsu aprovado para ${extensionIds.length} extensões.`);
}
