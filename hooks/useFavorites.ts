'use client';

import { useFavoritesContext } from '@/context/FavoritesContext';
import { useConfirmation } from '@/context/ConfirmationContext';
import { JikanAnime } from '@/types/anime';

export function useFavorites() {
  const context = useFavoritesContext();
  const { confirm } = useConfirmation();

  const toggleFavoriteWithConfirm = async (anime: JikanAnime) => {
    const favorited = context.isFavorite(anime.mal_id);
    if (favorited) {
      const animeTitle = anime.title || anime.title_english || 'Anime';
      const animeImage =
        anime.images?.jpg?.image_url ||
        anime.images?.webp?.image_url ||
        anime.images?.jpg?.large_image_url;

      const confirmed = await confirm({
        title: 'Remover dos Favoritos?',
        description: `Tem certeza que deseja remover "${animeTitle}" da sua lista de favoritos?`,
        confirmText: 'Sim, Remover',
        cancelText: 'Cancelar',
        variant: 'danger',
        animeTitle,
        animeImage,
        animeId: anime.mal_id,
      });

      if (confirmed) {
        context.removeFavorite(anime.mal_id);
      }
    } else {
      context.addFavorite(anime);
    }
  };

  const removeFavoriteWithConfirm = async (anime: JikanAnime) => {
    const animeTitle = anime.title || anime.title_english || 'Anime';
    const animeImage =
      anime.images?.jpg?.image_url ||
      anime.images?.webp?.image_url ||
      anime.images?.jpg?.large_image_url;

    const confirmed = await confirm({
      title: 'Remover dos Favoritos?',
      description: `Tem certeza que deseja remover "${animeTitle}" da sua lista de favoritos?`,
      confirmText: 'Sim, Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
      animeTitle,
      animeImage,
      animeId: anime.mal_id,
    });

    if (confirmed) {
      context.removeFavorite(anime.mal_id);
    }
  };

  return {
    ...context,
    toggleFavoriteWithConfirm,
    removeFavoriteWithConfirm,
  };
}
