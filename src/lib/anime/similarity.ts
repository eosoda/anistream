import { normalizeAnimeTitle } from './normalize-title';

export function calculateJaccardSimilarity(a: string, b: string): number {
  const normA = normalizeAnimeTitle(a);
  const normB = normalizeAnimeTitle(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const setA = new Set(normA.split(' ').filter(Boolean));
  const setB = new Set(normB.split(' ').filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0.0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Compara dois títulos de anime considerando títulos principais, originais e aliases alternativos.
 */
export function isTitleMatching(
  titleA: string,
  titleB: string,
  aliasesA: string[] = [],
  aliasesB: string[] = [],
  threshold = 0.60
): boolean {
  if (!titleA || !titleB) return false;

  const allA = [titleA, ...aliasesA].filter(Boolean).map(normalizeAnimeTitle).filter(Boolean);
  const allB = [titleB, ...aliasesB].filter(Boolean).map(normalizeAnimeTitle).filter(Boolean);

  // 1. Verificar igualdade exata ou contida entre qualquer combinação de A e B
  for (const a of allA) {
    for (const b of allB) {
      if (a === b) return true;
      if (a.length > 5 && b.length > 5) {
        if (a.includes(b) || b.includes(a)) return true;
      }
    }
  }

  // 2. Verificar similaridade de Jaccard entre qualquer combinação de nomes/aliases
  for (const a of allA) {
    for (const b of allB) {
      const score = calculateJaccardSimilarity(a, b);
      if (score >= threshold) return true;
    }
  }

  return false;
}
