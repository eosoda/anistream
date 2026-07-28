import { JikanAnime } from '@/types/anime';

// Known popular dubbed anime titles (or keywords) in PT-BR
const DUBBED_KEYWORDS = [
  'dragon ball',
  'naruto',
  'one piece',
  'attack on titan',
  'shingeki no kyojin',
  'demon slayer',
  'kimetsu no yaiba',
  'jujutsu kaisen',
  'my hero academia',
  'boku no hero',
  'death note',
  'bleach',
  'spy x family',
  'chainsaw man',
  'fullmetal alchemist',
  'hunter x hunter',
  'tokyo ghoul',
  'cyberpunk',
  'pokemon',
  'pokémon',
  'saint seiya',
  'yu yu hakusho',
  'digimon',
  'solo leveling',
  'monster',
  'vinland saga',
  'black clover',
  'sword art online',
  'fire force',
  'haikyuu',
  'dr. stone',
  'doctor stone',
  'mob psycho',
  'tokyo revengers',
  'overlord',
  're:zero',
  'konosuba',
  'shield hero',
  'classroom of the elite',
  'jojo',
  'sailor moon',
  'ranma',
  'inuyasha',
  'evangelion',
  'hellsing',
  'fairy tail',
  'blue lock',
  'kaiju no. 8',
  'dandadan',
  'frieren',
  'mashle',
  'slime',
  'tensei shitara',
  'blue exorcist',
  'assassination classroom',
  'steins;gate',
  'death parade',
  'code geass',
  'fate/stay',
  'no game no life',
  'parasyte',
  'kiseijuu',
  'your name',
  'kimi no na wa',
  'silent voice',
  'koe no katachi',
  'spirited away',
  'one punch man',
  'black butler',
  'soul eater',
  'nanatsu no taizai',
  'seven deadly sins',
  'dr stone',
  'boruto',
  'shadows house',
  'chainsaw',
  'horimiya',
  'wind breaker',
  'shangri-la',
];

// Major producers/licensors known for releasing dubbed content in Brazil
const DUBBED_LICENSORS = [
  'crunchyroll',
  'netflix',
  'funimation',
  'sato company',
  'artworks entertainment',
  'disney+',
  'disney',
  'sentai filmworks',
  'viz media',
  'hbo max',
  'max',
  'bandai namco',
];

/**
 * Checks if an anime has Portuguese Audio (Dublado) or Subtitles (Legendado)
 */
export function checkPtBrAvailability(anime: JikanAnime): { hasDub: boolean; hasSub: boolean } {
  if (!anime) return { hasDub: false, hasSub: false };

  const titleLower = (
    (anime.title || '') +
    ' ' +
    (anime.title_english || '') +
    ' ' +
    (anime.title_japanese || '') +
    ' ' +
    (anime.title_synonyms || []).join(' ')
  ).toLowerCase();

  const synopsisLower = (anime.synopsis || '').toLowerCase();
  const licensorsLower = (anime.licensors || []).map((l) => l.name.toLowerCase()).join(' ');
  const producersLower = (anime.producers || []).map((p) => p.name.toLowerCase()).join(' ');

  // Explicit title / synonym / synopsis indicators for Dubbing
  const explicitDub =
    titleLower.includes('dublado') ||
    titleLower.includes('dubbed') ||
    titleLower.includes('dub pt-br') ||
    synopsisLower.includes('dublado em português') ||
    synopsisLower.includes('dublagem em português') ||
    synopsisLower.includes('brazilian portuguese dub');

  // Check keyword matches for dubbing
  const keywordMatch = DUBBED_KEYWORDS.some((kw) => titleLower.includes(kw));

  // Check licensors / producers
  const licensorMatch = DUBBED_LICENSORS.some(
    (lic) => licensorsLower.includes(lic) || producersLower.includes(lic)
  );

  const isPopular = Boolean(
    (anime.members && anime.members > 40000) ||
    (anime.popularity && anime.popularity <= 3000) ||
    (anime.score && anime.score >= 7.0)
  );

  const hasDub: boolean = Boolean(explicitDub || keywordMatch || (licensorMatch && isPopular));

  // Subtitles in PT-BR are available for all mainstream / licensed anime
  const explicitSub =
    titleLower.includes('legendado') ||
    titleLower.includes('subbed') ||
    synopsisLower.includes('legendas em português');

  const hasSub: boolean = Boolean(explicitSub || licensorMatch || isPopular || (anime.members && anime.members > 3000) || true);

  return { hasDub, hasSub };
}

export function filterAnimeByAudio(
  animes: JikanAnime[],
  filter?: 'all' | 'subbed_pt' | 'dubbed_pt' | 'pt_br'
): JikanAnime[] {
  if (!filter || filter === 'all') return animes;

  return animes.filter((anime) => {
    const { hasDub, hasSub } = checkPtBrAvailability(anime);
    if (filter === 'dubbed_pt') return hasDub;
    if (filter === 'subbed_pt') return hasSub;
    if (filter === 'pt_br') return hasDub || hasSub;
    return true;
  });
}
