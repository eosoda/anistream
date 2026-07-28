import { normalizeAnimeTitle } from './normalize-title';

export function calculateJaccardSimilarity(a: string, b: string): number {
  const normA = normalizeAnimeTitle(a);
  const normB = normalizeAnimeTitle(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const setA = new Set(normA.split(' '));
  const setB = new Set(normB.split(' '));

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

export function isTitleMatching(
  titleA: string,
  titleB: string,
  aliasesA: string[] = [],
  aliasesB: string[] = [],
  threshold = 0.65
): boolean {
  const normA = normalizeAnimeTitle(titleA);
  const normB = normalizeAnimeTitle(titleB);

  // 1. Igualdade exata normalizada
  if (normA === normB) return true;

  // 2. Comparar com aliases de A
  for (const aliasA of aliasesA) {
    if (normalizeAnimeTitle(aliasA) === normB) return true;
  }

  // 3. Comparar com aliases de B
  for (const aliasB of aliasesB) {
    if (normalizeAnimeTitle(aliasB) === normA) return true;
  }

  // 4. Jaccard token similarity
  const score = calculateJaccardSimilarity(titleA, titleB);
  if (score >= threshold) return true;

  return false;
}
