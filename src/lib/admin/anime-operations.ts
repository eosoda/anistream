import { prisma } from '@/lib/db/prisma';
import { getAnimeCatalog, getAnimeEpisodes } from '@/lib/kenjitsu/catalog';

export async function syncAnimeById(animeId: string) {
  const anime = await prisma.anime.findUnique({ where: { id: animeId } });
  if (!anime) throw new Error('Anime não encontrado.');

  const [metadata, episodeItems] = await Promise.all([
    getAnimeCatalog(anime.id),
    getAnimeEpisodes(anime.id),
  ]);

  await prisma.anime.update({
    where: { id: anime.id },
    data: {
      title: metadata.title,
      normalizedTitle: metadata.title ? metadata.title.toLowerCase() : anime.normalizedTitle,
      originalTitle: metadata.title_japanese || anime.originalTitle,
      description: metadata.synopsis,
      synopsis: metadata.synopsis,
      posterUrl: metadata.images?.jpg?.large_image_url || anime.posterUrl,
      backdropUrl: metadata.bannerImage || anime.backdropUrl,
      rating: metadata.score,
      year: metadata.year,
      releaseYear: metadata.year,
      status: metadata.status,
      genres: metadata.genres?.map((genre) => genre.name).join(', ') || anime.genres,
    },
  });

  if (episodeItems.length === 0) {
    throw new Error('O Kenjitsu não retornou episódios para este anime.');
  }

  for (const item of episodeItems) {
    await prisma.episode.upsert({
      where: { animeId_season_number: { animeId: anime.id, season: 1, number: item.mal_id } },
      update: { title: item.title || `Episódio ${item.mal_id}` },
      create: { animeId: anime.id, season: 1, number: item.mal_id, title: item.title || `Episódio ${item.mal_id}` },
    });
  }

  return { animeTitle: anime.title, syncedEpisodesCount: episodeItems.length };
}
