import { useCallback, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import CardFilters from "../card-filters/CardFilters.tsx";
import { useCardsTable } from "../card-filters/useCardsTable.ts";
import CardTile from "./CardTile.tsx";
import CardDetailsOverlay from "./CardDetailsOverlay.tsx";
import type { CardAction, CardBrowserCard } from "./types.ts";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import useFavoriteCardAction from "../favorites/useFavoriteCardAction.ts";
import useBinderManagement from "../binder/useBinderManagement.ts";
import AddBinderCopyDialog from "../binder/AddBinderCopyDialog.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import { useNotify } from "../notifications/NotificationContext.ts";
import { createDeckEntryActions } from "../decks/deckEntryActions.ts";
import useCardBrowserResults from "./useCardBrowserResults.ts";
import SearchControls from "../search/SearchControls.tsx";
import type { CardPlaceEntry, CardPlaces } from "../card-filters/types.ts";
import "./CardBrowserPage.css";

type DeckEntryKind = "binder" | "proxy" | "virtual";

function isDeckEntryKind(kind: string): kind is DeckEntryKind {
  return ["binder", "proxy", "virtual"].some(
    (supportedKind) => supportedKind === kind,
  );
}

const ACTION_LABELS: Record<CardAction, string> = {
  favorite: "Favorites",
  binder: "Binder",
  deck: "Decks",
};

type CardBrowserPageProps = {
  mode?: "search" | "mulligan";
};

export default function CardBrowserPage({ mode = "search" }: CardBrowserPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { pathname } = location;
  const { user, isLoading: isAuthLoading } = useAuth();
  const favorites = useFavoriteCardAction();
  const {
    favoriteIds,
    ids: favoriteIdList,
    isLoading: areFavoritesLoading,
    error: favoritesError,
    realtimeError: favoritesRealtimeError,
  } = favorites;
  // Messages go to the app-wide notification stack (D-080).
  const notify = useNotify();
  const binder = useBinderManagement();
  const decks = useDeckManagement();
  const cardId = searchParams.get("card");
  const {
    searchQuery,
    nameSuggestions,
    nameSuggestionsError,
    isRandomRoute,
    isPersonalSearch,
    setsQuery,
    invalidSetData,
    mulliganSet,
    routeParam,
    cardSource,
    cards,
    invalidCardData,
    personalCardsError,
  } = useCardBrowserResults({
    mode,
    pathname,
    searchParams,
    user,
    favoriteIds,
    favoriteIdList,
    areFavoritesLoading,
    favoritesError,
    favoritesRealtimeError,
    binderCopies: binder.copies.copies,
    areBinderCopiesLoading: binder.copies.isLoading,
    binderCopiesError: binder.copies.error,
    deckCards: decks.deckCards,
    areDecksLoading: decks.isLoading,
    deckCardsError: decks.error,
  });
  const personalCardPlaces = useMemo<CardPlaces>(() => {
    const places = new Map<string, CardPlaceEntry>();
    const getPlaces = (scryfallId: string) => {
      const current = places.get(scryfallId);
      if (current) return current;
      const next: CardPlaceEntry = {
        favorite: false,
        binders: [],
        decks: [],
      };
      places.set(scryfallId, next);
      return next;
    };

    for (const id of favoriteIdList) {
      getPlaces(id).favorite = true;
    }

    const assignedCopyIds = new Set(
      decks.deckCards.flatMap((entry) =>
        entry.binder_card_id ? [entry.binder_card_id] : [],
      ),
    );
    for (const copy of binder.copies.copies) {
      if (copy.status !== "owned") continue;
      const entry = getPlaces(copy.scryfall_id);
      if (copy.binder_id) {
        const binderFolder = binder.binders.find(
          (item) => item.id === copy.binder_id,
        );
        if (binderFolder) {
          entry.binders.push({ id: binderFolder.id, name: binderFolder.name });
        }
      } else if (!assignedCopyIds.has(copy.id)) {
        entry.binders.push({ id: "loose", name: "Loose" });
      }
    }

    for (const deckCard of decks.deckCards) {
      if (!isDeckEntryKind(deckCard.kind)) continue;
      const deck = decks.decks.find((item) => item.id === deckCard.deck_id);
      if (!deck) continue;
      getPlaces(deckCard.scryfall_id).decks.push({
        id: deck.id,
        name: deck.name,
        kind: deckCard.kind,
      });
    }

    return places;
  }, [
    favoriteIdList,
    binder.copies.copies,
    binder.binders,
    decks.deckCards,
    decks.decks,
  ]);
  const cardPlaces =
    isPersonalSearch && !binder.bindersLoading && !decks.isLoading
      ? personalCardPlaces
      : undefined;
  const { table, filters, setFilters, resetFilters } = useCardsTable(cards, cardPlaces);
  const rows = table.getRowModel().rows;
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const orderedCards = rows.map((row) => {
    const card = cardsById.get(row.original.id);
    if (!card) throw new Error(`Filtered card ${row.original.id} was not in the cached result.`);
    return card;
  });
  const total = cards.length;

  // Pushes a history entry, so Back returns to the previous card or page.
  function openCardById(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("card", id);
    setSearchParams(next, { preventScrollReset: true });
  }

  function openCard(card: CardBrowserCard) {
    openCardById(card.id);
  }

  const closeDetails = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("card");
    setSearchParams(next, { preventScrollReset: true });
  }, [searchParams, setSearchParams]);

  function showActionNotice(action: CardAction, card: CardBrowserCard) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    const signIn = { link: { label: "Sign in", to: `/v2/login?next=${encodeURIComponent(nextPath)}` } };

    if (action === "binder") {
      if (!user) {
        notify.info("Sign in to manage your Binder.", signIn);
      }
      return;
    }

    if (action === "deck") {
      if (!user) {
        notify.info("Sign in to manage decks.", signIn);
      }
      return;
    }

    if (action !== "favorite") {
      notify.info(`${ACTION_LABELS[action]} for ${card.name} is under construction.`);
      return;
    }

    if (!user) {
      notify.info(`Sign in to save ${card.name} to Favorites.`, signIn);
      return;
    }

    favorites.toggleCardFavorite(card, user.id, {
      onSuccess: (wasFavorite) =>
        notify.info(
          wasFavorite
            ? `Removed ${card.name} from Favorites.`
            : `Added ${card.name} to Favorites.`,
        ),
      onError: (error) =>
        notify.error(
          `Could not update Favorites for ${card.name}: ${
            error.message
          }`,
        ),
    });
  }

  const favoriteActionDisabled =
    isAuthLoading ||
    areFavoritesLoading ||
    Boolean(favoritesError) ||
    favorites.isPending;
  const binderActionDisabled =
    isAuthLoading ||
    binder.bindersLoading ||
    binder.copies.isLoading ||
    decks.isLoading ||
    Boolean(binder.bindersError) ||
    Boolean(binder.copies.error) ||
    Boolean(decks.error) ||
    binder.isPending;
  const binderCopyProps = {
    binders: binder.binders,
    isBinderPending: binderActionDisabled,
    canManageBinder: Boolean(user),
    onAddBinderCopy: binder.requestAdd,
    onUpdateBinderCopy: (copy: BinderCopy, values: Parameters<typeof binder.updateCopy>[1]) =>
      binder.updateCopy(copy, values),
    onDisposeBinderCopy: (copy: BinderCopy, status: "sold" | "lost" | "given_away") =>
      binder.disposeCopy(copy.id, status),
    onRestoreBinderCopy: (copy: BinderCopy) => binder.restoreCopy(copy.id),
    onDeleteBinderCopy: (copy: BinderCopy) => binder.deleteCopy(copy.id),
  };
  const deckActionProps = {
    deckActions: decks,
    // D-079 take-out actions in the deck popover, with Undo in this notice.
    deckEntryActions: createDeckEntryActions({
      decks,
      binders: binder.binders,
      disposeCopies: binder.copies.disposeCopies.mutateAsync,
      notify,
    }),
    canManageDeck: Boolean(user),
  };

  return (
    <section className="page card-browser-page">
      {mode === "search" && !isRandomRoute && (
        <header className="card-browser__heading">
          <SearchControls
            key={searchQuery}
            query={searchQuery}
            nameSuggestions={nameSuggestions}
            nameSuggestionsError={nameSuggestionsError}
          />
          {isPersonalSearch && (
            <p className="card-browser__intro">
              {user
                ? `Search your favorites, owned Binder copies, and deck entries${searchQuery ? ` for “${searchQuery}”` : ""}.`
                : "Sign in to search your personal collection."}
            </p>
          )}
        </header>
      )}

      {isRandomRoute && setsQuery.isLoading && (
        <p className="page__message card-browser__message" role="status">
          Choosing today’s set…
        </p>
      )}

      {isRandomRoute && setsQuery.error && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load Scryfall sets: {setsQuery.error.message}
        </p>
      )}

      {isRandomRoute && invalidSetData && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Scryfall returned set data in an unexpected format.
        </p>
      )}

      {isRandomRoute &&
        !setsQuery.isLoading &&
        !setsQuery.error &&
        !invalidSetData &&
        !mulliganSet && (
          <p className="page__message card-browser__message" role="status">
            No booster-focused sets are available for today’s mulligan.
          </p>
        )}

      {cardSource.isLoading && (
        <p className="page__message card-browser__message" role="status">
          {isRandomRoute ? "Choosing seven cards…" : "Loading cards…"}
        </p>
      )}

      {cardSource.error && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load {isRandomRoute || cards.length === 0 ? "cards" : "additional cards"}:{" "}
          {cardSource.error.message}
        </p>
      )}

      {user && favoritesError && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load favorites: {favoritesError.message}
        </p>
      )}
      {user && favoritesRealtimeError && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Favorites updates from other devices may be delayed: {favoritesRealtimeError.message}
        </p>
      )}
      {user && personalCardsError && !cardSource.error && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load owned card printings: {personalCardsError.message}
        </p>
      )}
      {user && binder.copies.error && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {user && binder.bindersError && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {user && binder.realtimeError && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Binder updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {user && decks.error && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}

      {invalidCardData && (
        <p className="page__message page__message--error card-browser__message" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}

      {!user && isPersonalSearch && (
        <p className="page__message card-browser__message" role="status">
          <Link to={`/v2/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}>
            Sign in
          </Link>{" "}
          to search your personal collection.
        </p>
      )}

      {!cardSource.isLoading && !cardSource.error && !invalidCardData && (routeParam || isPersonalSearch) && total === 0 && (
        <p className="page__message card-browser__message">No cards found.</p>
      )}

      {cards.length > 0 && (
        <>
          <CardFilters
            filters={filters}
            setFilters={setFilters}
            onReset={resetFilters}
            shown={rows.length}
            total={total}
            feature="search"
            layout="floating"
            cardPlaces={cardPlaces}
          />
          <div className="card-grid card-browser__list" aria-label="Card search results">
            {orderedCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                onSelect={openCard}
                onAction={showActionNotice}
                isFavorite={favoriteIds.has(card.id)}
                isFavoritePending={favoriteActionDisabled}
                binderCopies={binder.copies.copiesByScryfallId.get(card.id) ?? []}
                {...binderCopyProps}
                {...deckActionProps}
              />
            ))}
          </div>
          {rows.length === 0 && (
            <p className="page__message card-browser__message">No cards match these filters.</p>
          )}
          {!isRandomRoute && cardSource.hasNextPage && (
            <div className="pagination">
              <button
                type="button"
                className="pagination__button"
                onClick={cardSource.fetchNextPage}
                disabled={cardSource.isFetchingNextPage}
              >
                {cardSource.isFetchingNextPage
                  ? "Loading more cards…"
                  : cardSource.error
                    ? "Retry loading more"
                    : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {cardId && (
        <CardDetailsOverlay
          key={cardId}
          cardId={cardId}
          fallbackCard={cards.find((card) => card.id === cardId)}
          onAction={showActionNotice}
          favoriteIds={favoriteIds}
          favoriteActionDisabled={favoriteActionDisabled}
          binderCopiesByScryfallId={binder.copies.copiesByScryfallId}
          {...binderCopyProps}
          {...deckActionProps}
          onOpenCard={openCardById}
          onClose={closeDetails}
        />
      )}
      {binder.cardToAdd && (
        <AddBinderCopyDialog
          card={binder.cardToAdd}
          binders={binder.binders}
          decks={decks.decks}
          onSave={binder.addCopy}
          onClose={binder.closeAdd}
          isSaving={binder.isPending}
        />
      )}
    </section>
  );
}
