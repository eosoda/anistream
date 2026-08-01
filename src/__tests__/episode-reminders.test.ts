import { describe, expect, it } from 'vitest';
import { isFinishedAnime } from '@/components/home/EpisodeRemindersPanel';
import type { JikanAnime } from '@/types/anime';

function anime(status: string | null, airing = false) {
  return { status, airing } as JikanAnime;
}

describe('lembretes de episódios', () => {
  it.each(['Finished Airing', 'Finished', 'Completed', 'Concluído', 'Finalizado'])(
    'exclui anime com status %s',
    (status) => expect(isFinishedAnime(anime(status))).toBe(true),
  );

  it.each(['Currently Airing', 'Not yet aired', 'Em Lançamento', null])(
    'mantém anime não finalizado com status %s',
    (status) => expect(isFinishedAnime(anime(status))).toBe(false),
  );
});
