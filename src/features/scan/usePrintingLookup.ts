import { useQuery } from "@tanstack/react-query";
import createApiClient from "../../services/createApiClient.ts";
import type { ApiRecord } from "../../services/createApiClient.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import type { CollectorLine } from "./parseCollectorLine.ts";

// Stage 2b of the recognition pipeline (D-062): look the reading up on
// Scryfall.
// - A set code and collector number: /cards/:code/:number returns exactly
//   one printing, or 404 when the reading was wrong.
// - A card name (name fallback, D-065 step 2): /cards/named?exact= returns
//   one printing of that card (Scryfall's default, usually the newest); the
//   user then picks the printing they hold.

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

export type LookupRequest = { line: CollectorLine } | { name: string } | null;

export default function usePrintingLookup(request: LookupRequest): PrintingLookup {
  const route = !request
    ? null
    : "line" in request
      ? `cards/${encodeURIComponent(request.line.setCode)}/${encodeURIComponent(request.line.collectorNumber)}`
      : "cards/named";
  const params = request && "name" in request ? { exact: request.name } : {};

  const query = useQuery<ApiRecord[], Error>({
    // Same key shape as useScryfallCardsSearch, so the printing is cached
    // and shared: scanning the same card again needs no new request.
    queryKey: ["scryfallCards", route, params, 0],
    queryFn: () => scryfallClient.fetchData(route ?? "", params),
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
