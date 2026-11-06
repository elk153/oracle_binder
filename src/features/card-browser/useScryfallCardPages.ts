import { useInfiniteQuery } from "@tanstack/react-query";
import type { ApiParams, ApiRecord } from "../../services/createApiClient.ts";
import type { CardSource } from "./types.ts";

type ScryfallCardPage = {
  cards: ApiRecord[];
  hasMore: boolean;
  nextPage: string | null;
};

const API_URL = "https://api.scryfall.com";
const SEARCH_PATH = "/cards/search";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildInitialUrl(params: ApiParams): string {
  const url = new URL(SEARCH_PATH, API_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function validateNextPage(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Scryfall indicated more cards but did not provide a next page URL.");
  }

  const url = new URL(value);
  if (url.origin !== API_URL || url.pathname !== SEARCH_PATH) {
    throw new Error("Scryfall returned an unexpected pagination URL.");
  }

  return url.toString();
}

async function fetchCardPage(url: string, signal: AbortSignal): Promise<ScryfallCardPage> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  const json: unknown = await response.json();

  if (!isRecord(json)) {
    throw new Error("Scryfall returned a response in an unexpected format.");
  }

  if (!response.ok || json.object === "error") {
    const details =
      typeof json.details === "string"
        ? json.details
        : typeof json.message === "string"
          ? json.message
          : `${response.status} ${response.statusText}`;
    throw new Error(`Scryfall API error: ${details}`);
  }

  if (
    json.object !== "list" ||
    !Array.isArray(json.data) ||
    !json.data.every(isRecord) ||
    typeof json.has_more !== "boolean"
  ) {
    throw new Error("Scryfall returned card data in an unexpected format.");
  }

  return {
    cards: json.data,
    hasMore: json.has_more,
    nextPage: json.has_more ? validateNextPage(json.next_page) : null,
  };
}

export default function useScryfallCardPages(
  queryParams: ApiParams | null,
  seedParam = 0,
): CardSource {
  const query = useInfiniteQuery({
    queryKey: ["scryfallCardPages", queryParams, seedParam],
    queryFn: ({ pageParam, signal }) =>
      fetchCardPage(
        pageParam ?? buildInitialUrl(queryParams ?? {}),
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage ?? undefined : undefined,
    enabled: queryParams !== null,
    staleTime: ONE_DAY_MS,
  });
  const cards = query.data?.pages.flatMap((page) => page.cards) ?? [];

  return {
    cards,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    error: query.error,
  };
}
