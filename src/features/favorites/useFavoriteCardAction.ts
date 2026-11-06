import { useFavoriteIds, useToggleFavorite } from "./useFavorites.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";

type FavoriteActionCallbacks = {
  onSuccess: (wasFavorite: boolean) => void;
  onError: (error: Error) => void;
};

/**
 * Shares favorite-toggle state and mutation behavior across card surfaces.
 * The caller supplies the authenticated user ID and owns user-facing notices.
 */
export default function useFavoriteCardAction() {
  const favorites = useFavoriteIds();
  const mutation = useToggleFavorite();

  function toggleCardFavorite(
    card: CardBrowserCard,
    userId: string | null,
    callbacks: FavoriteActionCallbacks,
  ) {
    if (!userId) {
      throw new Error("Sign in to change favorites.");
    }

    const wasFavorite = favorites.favoriteIds.has(card.id);
    mutation.mutate(
      { userId, scryfallId: card.id, isFavorite: wasFavorite },
      {
        onSuccess: () => callbacks.onSuccess(wasFavorite),
        onError: callbacks.onError,
      },
    );
  }

  return {
    ...favorites,
    isPending: mutation.isPending,
    toggleCardFavorite,
  };
}
