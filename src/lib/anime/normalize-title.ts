export function normalizeAnimeTitle(title: string): string {
  if (!title) return '';

  return (
    title
      // 1. Tratar numerais ordinais ou de temporada ANTES de desmembrar acentos (ex: "2ª temporada" -> "2 temporada", "2nd season" -> "2 season")
      .replace(/(\d+)(ª|º|st|nd|rd|th)/gi, '$1')
      // 2. Normalização Unicode NFKD para separar acentos
      .normalize('NFKD')
      // 3. Remover marcas diacríticas / acentos
      .replace(/[\u0300-\u036f]/g, '')
      // 4. Converter para minúsculas
      .toLowerCase()
      // 5. Normalizar palavras chave de dublagem / legenda mantendo temporadas
      .replace(/\b(dublado|legendado|dub|sub|pt-br|eng|uncensored|bd|bluray)\b/gi, '')
      // 6. Converter numerais romanos básicos (ii -> 2, iii -> 3, iv -> 4, v -> 5, vi -> 6) se forem palavra única
      .replace(/\bii\b/g, '2')
      .replace(/\biii\b/g, '3')
      .replace(/\biv\b/g, '4')
      .replace(/\bv\b/g, '5')
      .replace(/\bvi\b/g, '6')
      // 7. Remover caracteres especiais e pontuações (preservando números e letras)
      .replace(/[^a-z0-9\s]/g, ' ')
      // 8. Colapsar espaços duplos
      .replace(/\s+/g, ' ')
      .trim()
  );
}
