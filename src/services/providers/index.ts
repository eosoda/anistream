/**
 * Módulo de Provedores de Streaming (Fase 1)
 *
 * Esta interface e diretório servirão de base para a futura integração
 * com servidores de vídeo, extratores e múltiplos provedores de streaming.
 */

export interface EpisodeProvider {
  search(animeTitle: string): Promise<any>;
  getEpisodes(animeId: string): Promise<any>;
  getStream(animeId: string, episode: number): Promise<any>;
}

export const activeProviders: EpisodeProvider[] = [];
