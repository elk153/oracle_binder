import { useQuery } from "@tanstack/react-query";
import createApiClient from "../../services/createApiClient.ts";
import type { ApiRecord } from "../../services/createApiClient.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import type { CollectorLine } from "./parseCollectorLine.ts";

// Stage 2b of the recognition pipeline (D-062): look the read set code and
// collector number up on Scryfall. /cards/:code/:number returns exactly one
// printing, or 404 when the reading was wrong.

const scryfallClient = createApiClient("https://api.scryfall.com");

export type PrintingLookup =
  | { status: "idle" } // nothing to look up
  | { status: "loading" }
  | { status: "found"; card: CardBrowserCard }
  | { status: "not-found" } // no such printing: most likely a misread
  | { status: "error"; message: string };

// createApiClient throws "[API error] 404 — …" for a missing printing.
function isNotFound(error: Error): boolean {
  return error.message.includes("] 404");
}

export default function usePrintingLookup(line: CollectorLine | null): PrintingLookup {
  const route = line
    ? `cards/${encodeURIComponent(line.setCode)}/${encodeURIComponent(line.collectorNumber)}`
    : null;

  const query = useQuery<ApiRecord[], Error>({
    // Same key shape as useScryfallCardsSearch, so the printing is cached
    // and shared: scanning the same card again needs no new request.
    queryKey: ["scryfallCards", route, {}, 0],
    queryFn: () => scryfallClient.fetchData(route ?? ""),
    enabled: route !== null,
    staleTime: 1000 * 86400,
    // A misread gives a 404; retrying it (3 times by default) would only add
    // requests. Scryfall asks clients to keep request volume low.
    retry: false,
  });

  if (route === null) {
    return { status: "idle" };
  }
  if (query.isPending) {
    return { status: "loading" };
  }
  if (query.isError) {
    return isNotFound(query.error)
      ? { status: "not-found" }
      : { status: "error", message: query.error.message };
  }
  const card = query.data[0];
  return isCardBrowserCard(card)
    ? { status: "found", card }
    : { status: "error", message: "Scryfall returned an unexpected card." };
}
