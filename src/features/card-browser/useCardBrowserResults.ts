import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { BinderCopy } from "../binder/useBinderCopies.ts";
import type { DeckCard } from "../decks/useDeckManagement.ts";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import useScryfallCardsForIds from "../../hooks/useScryfallCardsForIds.ts";
import {
  getMulliganSets,
  isScryfallSet,
  selectDailyMulliganSet,
} from "./mulliganSets.ts";
import type { CardBrowserCard, CardSource } from "./types.ts";
import { isCardBrowserCard } from "./types.ts";
import useScryfallCardPages from "./useScryfallCardPages.ts";
import useScryfallCardsSearch from "./useScryfallCardsSearch.ts";
import getSecondsUntilNextLocalFour from "../../hooks/getSecondsUntilNextLocalFour.ts";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NO_DATA: unknown[] = [];

type UseCardBrowserResultsOptions = {
  mode: "search" | "mulligan";
  pathname: string;
  searchParams: URLSearchParams;
  user: User | null;
  favoriteIds: ReadonlySet<string>;
  favoriteIdList: string[];
  areFavoritesLoading: boolean;
  favoritesError: Error | null;
  favoritesRealtimeError: Error | null;
  binderCopies: BinderCopy[];
  areBinderCopiesLoading: boolean;
  binderCopiesError: Error | null;
  deckCards: DeckCard[];
  areDecksLoading: boolean;
  deckCardsError: Error | null;
};

/**
 * Resolves the browser URL into Scryfall or personal-collection results.
 * Owns daily mulligan timing and the queries used to hydrate displayed cards.
 */
export default function useCardBrowserResults({
  mode,
  pathname,
  searchParams,
  user,
  favoriteIds,
  favoriteIdList,
  areFavoritesLoading,
  favoritesError,
  favoritesRealtimeError,
  binderCopies,
  areBinderCopiesLoading,
  binderCopiesError,
  deckCards,
  areDecksLoading,
  deckCardsError,
}: UseCardBrowserResultsOptions) {
  const searchQuery = searchParams.get("q")?.trim() ?? "";
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
  const cardNamesQuery = useFetchUrl(
    "cardNames",
    "https://api.scryfall.com/catalog/card-names",
    getSecondsUntilNextLocalFour,
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
  const mulliganQuery = mulliganSet ? `set:${mulliganSet.code}` : "";
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

  const personalCardIds = useMemo(() => {
    if (!isPersonalSearch) {
      return isRandomRoute || !searchQuery ? [] : favoriteIdList;
    }

    return [
      ...new Set([
        ...favoriteIdList,
        ...binderCopies
          .filter((copy) => copy.status === "owned")
          .map((copy) => copy.scryfall_id),
        ...deckCards.map((entry) => entry.scryfall_id),
      ]),
    ].sort();
  }, [
    isPersonalSearch,
    isRandomRoute,
    searchQuery,
    favoriteIdList,
    binderCopies,
    deckCards,
  ]);
  const personalCardsQuery = useScryfallCardsForIds(
    "personal",
    personalCardIds,
    Boolean(user) &&
      !areFavoritesLoading &&
      (!isPersonalSearch ||
        (!areBinderCopiesLoading && !areDecksLoading)),
  );
  const nameSuggestions = useMemo(() => {
    const names = isPersonalSearch
      ? (personalCardsQuery.data ?? [])
          .filter(isCardBrowserCard)
          .map((card) => card.name)
      : (cardNamesQuery.data ?? []).filter(
          (name): name is string => typeof name === "string",
        );
    return [...new Set(names)];
  }, [isPersonalSearch, personalCardsQuery.data, cardNamesQuery.data]);
  const displayCards = useMemo(() => {
    const searchCards = searchCardSource.cards;
    if (isPersonalSearch) {
      const normalizedQuery = searchQuery.toLocaleLowerCase();
      return (personalCardsQuery.data ?? []).filter(
        (card) =>
          !isCardBrowserCard(card) ||
          card.name.toLocaleLowerCase().includes(normalizedQuery),
      );
    }

    if (isRandomRoute || !searchQuery || !user) return searchCards;
    const searchCardIds = new Set(
      searchCards.filter(isCardBrowserCard).map((card) => card.id),
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
      ? areFavoritesLoading ||
        areBinderCopiesLoading ||
        areDecksLoading ||
        personalCardsQuery.isLoading
      : searchCardSource.isLoading,
    hasNextPage: isPersonalSearch ? false : searchCardSource.hasNextPage,
    error: isPersonalSearch
      ? favoritesError ??
        favoritesRealtimeError ??
        binderCopiesError ??
        deckCardsError ??
        personalCardsQuery.error ??
        null
      : searchCardSource.error,
  };
  const rawCards = cardSource.cards;
  const invalidCardData = rawCards.some((card) => !isCardBrowserCard(card));
  const cards = useMemo<CardBrowserCard[]>(
    () =>
      invalidCardData
        ? []
        : isRandomRoute
          ? rawCards.filter(isCardBrowserCard).slice(0, 7)
          : rawCards.filter(isCardBrowserCard),
    [rawCards, invalidCardData, isRandomRoute],
  );

  return {
    searchQuery,
    nameSuggestions,
    nameSuggestionsError: isPersonalSearch ? null : cardNamesQuery.error,
    isRandomRoute,
    isPersonalSearch,
    setsQuery,
    invalidSetData,
    mulliganSet,
    routeParam,
    cardSource,
    cards,
    invalidCardData,
    personalCardsError: personalCardsQuery.error,
  };
}
