import { keepPreviousData, useQuery } from "@tanstack/react-query";
import fetchScryfallCardsForIds from "../services/fetchScryfallCardsForIds.ts";

type Options = {
  /**
   * Keep showing the previous result while a changed id list loads. The ids
   * are part of the query key, so removing one card makes a new query; without
   * this the page would show its loading state until Scryfall answers. Pages
   * that filter the cards against their own list (Binder, Decks) can use it
   * safely (D-079).
   */
  keepPrevious?: boolean;
};

export default function useScryfallCardsForIds(
  source: string,
  ids: string[],
  enabled: boolean,
  { keepPrevious = false }: Options = {},
) {
  return useQuery({
    queryKey: ["scryfallCollection", source, ids],
    queryFn: ({ signal }) => fetchScryfallCardsForIds(ids, signal),
    enabled: enabled && ids.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
