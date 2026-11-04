import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import CardFilters from "../card-filters/CardFilters.tsx";
import { useCardsTable } from "../card-filters/useCardsTable.ts";
import CardTile from "./CardTile.tsx";
import CardDetailsOverlay from "./CardDetailsOverlay.tsx";
import type { CardAction, CardBrowserCard, CardSource } from "./types.ts";
import { isCardBrowserCard } from "./types.ts";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { useFavoriteIds, useToggleFavorite } from "../favorites/useFavorites.ts";
import useScryfallCardsSearch from "../../hooks/useScryfallCardsSearch.ts";
import useScryfallCardPages from "../../hooks/useScryfallCardPages.ts";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import useScryfallCardsForIds from "../../hooks/useScryfallCardsForIds.ts";
import useBinderManagement from "../binder/useBinderManagement.ts";
import AddBinderCopyDialog from "../binder/AddBinderCopyDialog.tsx";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import {
  getMulliganSets,
  isScryfallSet,
  selectDailyMulliganSet,
} from "./mulliganSets.ts";
import "./CardBrowserPage.css";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NO_DATA: unknown[] = [];

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
  const {
    favoriteIds,
    ids: favoriteIdList,
    isLoading: areFavoritesLoading,
    error: favoritesError,
    realtimeError: favoritesRealtimeError,
  } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const [notice, setNotice] = useState("");
  const [signInPath, setSignInPath] = useState<string | null>(null);
  const binder = useBinderManagement(setNotice);
  const decks = useDeckManagement();
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const cardId = searchParams.get("card");
  const isRandomRoute = mode === "mulligan" || pathname.endsWith("/random");
  const isPersonalSearch =
    !isRandomRoute && searchParams.get("source") === "collection";
  const [dailyDay, setDailyDay] = useState(() =>
    Math.floor(Date.now() / MILLISECONDS_PER_DAY),
  );

  useEffect(() => {
    const nextUtcMidnight = (dailyDay + 1) * MILLISECONDS_PER_DAY;
    const timer = window.setTimeout(
      () => setDailyDay(Math.floor(Date.now() / MILLISECONDS_PER_DAY)),
      nextUtcMidnight - Date.now(),
    );
    return () => window.clearTimeout(timer);
  }, [dailyDay]);
  const setsQuery = useFetchUrl(
    "scryfallSets",
    "https://api.scryfall.com/sets",
  );
  const rawSets = setsQuery.data ?? NO_DATA;
  const invalidSetData = rawSets.some((value) => !isScryfallSet(value));
  const availableSets = useMemo(
    () =>
      invalidSetData
        ? []
        : getMulliganSets(rawSets.filter(isScryfallSet)),
    [invalidSetData, rawSets],
  );
  const mulliganSet = isRandomRoute
    ? selectDailyMulliganSet(availableSets, dailyDay)
    : undefined;
  const mulliganQuery = mulliganSet
    ? `set:${mulliganSet.code}`
    : "";
  const routeParam = isRandomRoute
    ? mulliganSet
      ? "cards/search"
      : null
    : searchQuery && !isPersonalSearch
      ? "cards/search"
      : null;
  const queryParams = isRandomRoute
    ? { q: mulliganQuery, unique: "cards", order: "random", format: "json" }
    : { q: searchQuery, format: "json" };
  const querySeed = isRandomRoute ? dailyDay : 0;
  const singlePageSearch = useScryfallCardsSearch(
    isRandomRoute ? routeParam : null,
    queryParams,
    querySeed,
  );
  const paginatedSearch = useScryfallCardPages(
    !isRandomRoute && routeParam ? queryParams : null,
    querySeed,
  );
  const searchCardSource: CardSource = isRandomRoute
    ? {
        cards: singlePageSearch.data ?? [],
        isLoading: singlePageSearch.isLoading,
        isFetchingNextPage: false,
        hasNextPage: false,
        fetchNextPage: () => {},
        error: singlePageSearch.error,
      }
    : paginatedSearch;
  const personalCardIds = useMemo(
    () => {
      if (!isPersonalSearch) {
        return isRandomRoute || !searchQuery ? [] : favoriteIdList;
      }
      return [...new Set([
        ...favoriteIdList,
        ...binder.copies.copies
          .filter((copy) => copy.status === "owned")
          .map((copy) => copy.scryfall_id),
      ])].sort();
    },
    [
      isPersonalSearch,
      isRandomRoute,
      searchQuery,
      favoriteIdList,
      binder.copies.copies,
    ],
  );
  const personalCardsQuery = useScryfallCardsForIds(
    "personal",
    personalCardIds,
    Boolean(user) &&
      !areFavoritesLoading &&
      (!isPersonalSearch || !binder.copies.isLoading),
  );
  const displayCards = useMemo(() => {
    const searchCards = searchCardSource.cards;
    if (isPersonalSearch) {
      return personalCardsQuery.data ?? [];
    }

    if (isRandomRoute || !searchQuery || !user) return searchCards;
    const searchCardIds = new Set(
      searchCards
        .filter(isCardBrowserCard)
        .map((card) => card.id),
    );
    const matchingFavorites = (personalCardsQuery.data ?? []).filter(
      (card) =>
        favoriteIds.has(card.id) &&
        isCardBrowserCard(card) &&
        card.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) &&
        !searchCardIds.has(card.id),
    );
    return [...searchCards, ...matchingFavorites];
  }, [
    searchCardSource.cards,
    isPersonalSearch,
    personalCardsQuery.data,
    isRandomRoute,
    searchQuery,
    user,
    favoriteIds,
  ]);
  const cardSource: CardSource = {
    ...searchCardSource,
    cards: displayCards,
    isLoading: isPersonalSearch
      ? areFavoritesLoading || binder.copies.isLoading || personalCardsQuery.isLoading
      : searchCardSource.isLoading,
    hasNextPage: isPersonalSearch ? false : searchCardSource.hasNextPage,
    error: isPersonalSearch
      ? favoritesError ??
        favoritesRealtimeError ??
        binder.copies.error ??
        personalCardsQuery.error ??
        null
      : searchCardSource.error,
  };
  const rawCards = cardSource.cards;
  const invalidCardData = rawCards?.some((card) => !isCardBrowserCard(card)) ?? false;
  const cards = useMemo<CardBrowserCard[]>(
    () =>
      rawCards && !invalidCardData
        ? isRandomRoute
          ? rawCards.filter(isCardBrowserCard).slice(0, 7)
          : rawCards.filter(isCardBrowserCard)
        : [],
    [rawCards, invalidCardData, isRandomRoute],
  );
  const { table, filters, setFilters, resetFilters } = useCardsTable(cards);
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

  function showActionNotice(action: CardAction, card: CardBrowserCard) {
    setSignInPath(null);

    if (action === "binder") {
      if (!user) {
        const nextPath = `${location.pathname}${location.search}${location.hash}`;
        setNotice("Sign in to manage your Binder.");
        setSignInPath(`/v2/login?next=${encodeURIComponent(nextPath)}`);
      }
      return;
    }

    if (action === "deck") {
      if (!user) {
        const nextPath = `${location.pathname}${location.search}${location.hash}`;
        setNotice("Sign in to manage decks.");
        setSignInPath(`/v2/login?next=${encodeURIComponent(nextPath)}`);
      }
      return;
    }

    if (action !== "favorite") {
      setNotice(`${ACTION_LABELS[action]} for ${card.name} is under construction.`);
      return;
    }

    if (!user) {
      const nextPath = `${location.pathname}${location.search}${location.hash}`;
      setNotice(`Sign in to save ${card.name} to Favorites.`);
      setSignInPath(`/v2/login?next=${encodeURIComponent(nextPath)}`);
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

  const favoriteActionDisabled =
    isAuthLoading ||
    areFavoritesLoading ||
    Boolean(favoritesError) ||
    toggleFavorite.isPending;
  const binderActionDisabled =
    isAuthLoading ||
    binder.bindersLoading ||
    binder.copies.isLoading ||
    Boolean(binder.bindersError) ||
    Boolean(binder.copies.error) ||
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
    canManageDeck: Boolean(user),
  };

  return (
    <section className="card-browser-page">
      <header className="card-browser__heading">
        {!isRandomRoute && !searchQuery && !isPersonalSearch && (
          <p>Enter a card name in the search field to browse Scryfall.</p>
        )}
        {isPersonalSearch && (
          <p>
            {user
              ? `Search your favorites and owned binder copies${searchQuery ? ` for “${searchQuery}”` : ""}.`
              : "Sign in to search your personal collection."}
          </p>
        )}
      </header>

      {isRandomRoute && setsQuery.isLoading && (
        <p className="card-browser__message" role="status">
          Choosing today’s set…
        </p>
      )}

      {isRandomRoute && setsQuery.error && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load Scryfall sets: {setsQuery.error.message}
        </p>
      )}

      {isRandomRoute && invalidSetData && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Scryfall returned set data in an unexpected format.
        </p>
      )}

      {isRandomRoute &&
        !setsQuery.isLoading &&
        !setsQuery.error &&
        !invalidSetData &&
        !mulliganSet && (
          <p className="card-browser__message" role="status">
            No booster-focused sets are available for today’s mulligan.
          </p>
        )}

      {cardSource.isLoading && (
        <p className="card-browser__message" role="status">
          {isRandomRoute ? "Choosing seven cards…" : "Loading cards…"}
        </p>
      )}

      {cardSource.error && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load {isRandomRoute || cards.length === 0 ? "cards" : "additional cards"}:{" "}
          {cardSource.error.message}
        </p>
      )}

      {user && favoritesError && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load favorites: {favoritesError.message}
        </p>
      )}
      {user && favoritesRealtimeError && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Favorites updates from other devices may be delayed: {favoritesRealtimeError.message}
        </p>
      )}
      {user && personalCardsQuery.error && !cardSource.error && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load owned card printings: {personalCardsQuery.error.message}
        </p>
      )}
      {user && binder.copies.error && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load Binder copies: {binder.copies.error.message}
        </p>
      )}
      {user && binder.bindersError && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load binders: {binder.bindersError.message}
        </p>
      )}
      {user && binder.realtimeError && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Binder updates from other devices may be delayed: {binder.realtimeError.message}
        </p>
      )}
      {user && decks.error && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Could not load decks: {decks.error.message}
        </p>
      )}

      {invalidCardData && (
        <p className="card-browser__message card-browser__message--error" role="alert">
          Scryfall returned card data in an unexpected format.
        </p>
      )}

      {!user && isPersonalSearch && (
        <p className="card-browser__message" role="status">
          <Link to={`/v2/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`}>
            Sign in
          </Link>{" "}
          to search your personal collection.
        </p>
      )}

      {!cardSource.isLoading && !cardSource.error && !invalidCardData && (routeParam || isPersonalSearch) && total === 0 && (
        <p className="card-browser__message">No cards found.</p>
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
          />
          <div className="card-browser__list" aria-label="Card search results">
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
            <p className="card-browser__message">No cards match these filters.</p>
          )}
          {!isRandomRoute && cardSource.hasNextPage && (
            <div className="card-browser__pagination">
              <button
                type="button"
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

      {notice && (
        <div className="card-browser__notice" role="status">
          <span>{notice}</span>
          {signInPath && <Link to={signInPath}>Sign in</Link>}
          <button
            type="button"
            onClick={() => {
              setNotice("");
              setSignInPath(null);
            }}
          >
            Dismiss
          </button>
        </div>
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
