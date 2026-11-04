import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import CardFilters from "../card-filters/CardFilters.tsx";
import { useCardsTable } from "../card-filters/useCardsTable.ts";
import CardTile from "../card-browser/CardTile.tsx";
import CardDetailsOverlay from "../card-browser/CardDetailsOverlay.tsx";
import type { CardAction, CardBrowserCard } from "../card-browser/types.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { useFavoriteIds, useToggleFavorite } from "./useFavorites.ts";
import useFavoriteCards from "./useFavoriteCards.ts";
import useBinderManagement from "../binder/useBinderManagement.ts";
import AddBinderCopyDialog from "../binder/AddBinderCopyDialog.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import "./FavoritesPage.css";

const ACTION_LABELS: Record<CardAction, string> = {
  favorite: "Favorites",
  binder: "Binder",
  deck: "Decks",
};

export default function FavoritesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const favoriteSource = useFavoriteCards();
  const {
    favoriteIds,
    isLoading: areFavoriteIdsLoading,
    error: favoriteIdsError,
    realtimeError: favoritesRealtimeError,
  } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const [notice, setNotice] = useState("");
  const binder = useBinderManagement(setNotice);
  const decks = useDeckManagement();
  const cardId = searchParams.get("card");
  const invalidCardData = favoriteSource.cards.some(
    (card) => !isCardBrowserCard(card),
  );
  const cards = useMemo<CardBrowserCard[]>(
    () =>
      invalidCardData
        ? []
        : favoriteSource.cards.filter(isCardBrowserCard),
    [favoriteSource.cards, invalidCardData],
  );
  const { table, filters, setFilters, resetFilters } = useCardsTable(cards);
  const rows = table.getRowModel().rows;
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const filteredCards = rows.map((row) => {
    const card = cardsById.get(row.original.id);
    if (!card) {
      throw new Error(`Filtered favorite ${row.original.id} was not in the loaded results.`);
    }
    return card;
  });
  const favoriteActionDisabled =
    areFavoriteIdsLoading ||
    Boolean(favoriteIdsError) ||
    toggleFavorite.isPending;
  const binderActionDisabled =
    binder.bindersLoading ||
    binder.copies.isLoading ||
    Boolean(binder.bindersError) ||
    Boolean(binder.copies.error) ||
    binder.isPending;

  function openCard(card: CardBrowserCard) {
    const next = new URLSearchParams(searchParams);
    next.set("card", card.id);
    setSearchParams(next, { preventScrollReset: true });
  }

  const closeDetails = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("card");
    setSearchParams(next, { preventScrollReset: true });
  }, [searchParams, setSearchParams]);

  function handleAction(action: CardAction, card: CardBrowserCard) {
    if (action === "deck") {
      if (!user) setNotice("Sign in to manage decks.");
      return;
    }

    if (action !== "favorite") {
      setNotice(`${ACTION_LABELS[action]} for ${card.name} is under construction.`);
      return;
    }

    if (!user) {
      setNotice("Sign in to manage your favorites.");
      return;
    }

    const wasFavorite = favoriteIds.has(card.id);
    toggleFavorite.mutate(
      { userId: user.id, scryfallId: card.id, isFavorite: wasFavorite },
      {
        onSuccess: () =>
          setNotice(
            wasFavorite
              ? `Removed ${card.name} from Favorites.`
              : `Added ${card.name} to Favorites.`,
          ),
        onError: (error) =>
          setNotice(`Could not update Favorites for ${card.name}: ${error.message}`),
      },
    );
  }

  return (
    <section className="favorites-page">
      <header className="favorites-page__heading">
        {/*<h1>Favorites</h1>*/}
      </header>

      {favoriteSource.isLoading && (
        <p className="favorites-page__message" role="status">
          Loading your favorites…
        </p>
      )}

      {favoriteSource.error && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Could not load favorites: {favoriteSource.error.message}
        </p>
      )}

      {favoriteIdsError && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Could not load favorite status: {favoriteIdsError.message}
        </p>
      )}
      {favoritesRealtimeError && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Favorites updates from other devices may be delayed: {favoritesRealtimeError.message}
        </p>
      )}
      {binder.realtimeError && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {binder.copies.error && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {binder.bindersError && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {decks.error && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}

      {invalidCardData && (
        <p className="favorites-page__message favorites-page__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}

      {!favoriteSource.isLoading &&
        !favoriteSource.error &&
        !invalidCardData &&
        cards.length === 0 && (
          <p className="favorites-page__message">
            No available cards were found in your favorites.
          </p>
        )}

      {cards.length > 0 && (
        <>
          <CardFilters
            filters={filters}
            setFilters={setFilters}
            onReset={resetFilters}
            shown={rows.length}
            total={cards.length}
            feature="search"
            layout="floating"
          />
          <div className="favorites-page__list" aria-label="Favorite cards">
            {filteredCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onSelect={openCard}
                onAction={handleAction}
                isFavorite={favoriteIds.has(card.id)}
                isFavoritePending={favoriteActionDisabled}
                binderCopies={binder.copies.copiesByScryfallId.get(card.id) ?? []}
                binders={binder.binders}
                isBinderPending={binderActionDisabled}
                canManageBinder={Boolean(user)}
                onAddBinderCopy={binder.requestAdd}
                onUpdateBinderCopy={(copy: BinderCopy, values) =>
                  binder.updateCopy(copy, values)
                }
                onDisposeBinderCopy={(copy: BinderCopy, status) =>
                  binder.disposeCopy(copy.id, status)
                }
                onRestoreBinderCopy={(copy: BinderCopy) =>
                  binder.restoreCopy(copy.id)
                }
                onDeleteBinderCopy={(copy: BinderCopy) =>
                  binder.deleteCopy(copy.id)
                }
                deckActions={decks}
                canManageDeck={Boolean(user)}
              />
            ))}
          </div>
          {rows.length === 0 && (
            <p className="favorites-page__message">
              No favorites match these filters.
            </p>
          )}
        </>
      )}

      {(favoriteSource.hasNextPage || favoriteSource.error) && (
        <div className="favorites-page__pagination">
          <button
            type="button"
            onClick={favoriteSource.error ? favoriteSource.retry : favoriteSource.fetchNextPage}
            disabled={favoriteSource.isFetchingNextPage}
          >
            {favoriteSource.isFetchingNextPage
              ? "Loading more favorites…"
              : favoriteSource.error
                ? "Retry loading favorites"
                : "Load more favorites"}
          </button>
        </div>
      )}

      {notice && (
        <div className="favorites-page__notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}

      {cardId && (
        <CardDetailsOverlay
          key={cardId}
          cardId={cardId}
          fallbackCard={cards.find((card) => card.id === cardId)}
          onAction={handleAction}
          favoriteIds={favoriteIds}
          favoriteActionDisabled={favoriteActionDisabled}
          binderCopiesByScryfallId={binder.copies.copiesByScryfallId}
          binders={binder.binders}
          isBinderPending={binderActionDisabled}
          canManageBinder={Boolean(user)}
          onAddBinderCopy={binder.requestAdd}
          onUpdateBinderCopy={(copy: BinderCopy, values) =>
            binder.updateCopy(copy, values)
          }
          onDisposeBinderCopy={(copy: BinderCopy, status) =>
            binder.disposeCopy(copy.id, status)
          }
          onRestoreBinderCopy={(copy: BinderCopy) => binder.restoreCopy(copy.id)}
          onDeleteBinderCopy={(copy: BinderCopy) => binder.deleteCopy(copy.id)}
          deckActions={decks}
          canManageDeck={Boolean(user)}
          onClose={closeDetails}
        />
      )}
      {binder.cardToAdd && (
        <AddBinderCopyDialog
          card={binder.cardToAdd}
          binders={binder.binders}
          onSave={binder.addCopy}
          onClose={binder.closeAdd}
          isSaving={binder.copies.addCopy.isPending}
        />
      )}
    </section>
  );
}
