import { useMemo } from "react";
import useFetchUrl from "./useFetchUrl.ts";

export type CardSymbol = {
  symbol: string;
  english: string;
  svg_uri: string;
  appears_in_mana_costs: boolean;
  funny: boolean;
};

/** Type guard: true when an unknown API value has the fields we rely on. */
function isCardSymbol(value: unknown): value is CardSymbol {
  if (typeof value !== "object" || value === null) return false;

  return (
    "symbol" in value &&
    typeof value.symbol === "string" &&
    "english" in value &&
    typeof value.english === "string" &&
    "svg_uri" in value &&
    typeof value.svg_uri === "string" &&
    "appears_in_mana_costs" in value &&
    typeof value.appears_in_mana_costs === "boolean" &&
    "funny" in value &&
    typeof value.funny === "boolean"
  );
}

/**
 * Custom hook: Scryfall card symbols ({T}, {W}, {2/U}, ...) from the shared
 * `cardSymbols` query. It uses the same key as the prefetch in `App.tsx`, so
 * it reads the cache and sends no extra request.
 */
export default function useCardSymbols() {
  const query = useFetchUrl(
    "cardSymbols",
    "https://api.scryfall.com/symbology",
    Infinity,
  );
  const symbols = useMemo(
    () => (query.data ?? []).filter(isCardSymbol),
    [query.data],
  );

  return { symbols, error: query.error, isLoading: query.isLoading };
}
