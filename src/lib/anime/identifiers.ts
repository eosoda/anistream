export interface ExternalIdentifiers {
  mal?: string;
  anilist?: string;
  kitsu?: string;
  anidb?: string;
  [key: string]: string | undefined;
}

export function areIdentifiersMatching(
  idsA: ExternalIdentifiers,
  idsB: ExternalIdentifiers
): boolean {
  if (!idsA || !idsB) return false;

  const providers = ['mal', 'anilist', 'kitsu', 'anidb'];
  for (const provider of providers) {
    if (
      idsA[provider] &&
      idsB[provider] &&
      idsA[provider] === idsB[provider]
    ) {
      return true;
    }
  }

  return false;
}
