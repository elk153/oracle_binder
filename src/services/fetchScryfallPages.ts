/*
 * D-074: reads every page of a Scryfall list (e.g. a card's printings in all
 * languages, which often passes Scryfall's 175 cards per page: Sol Ring has
 * over 400). Pages are read one after another with a short gap, like
 * `fetchScryfallCardsForIds`, and at most `maxPages` of them, so a card
 * with thousands of printings (basic lands) costs a bounded number of
 * requests.
 */

const REQUEST_GAP_MS = 100;
export const DEFAULT_MAX_PAGES = 10;

export type ScryfallPages = {
  data: unknown[];
  /** Scryfall's `total_cards`, or null when the list does not say. */
  totalCards: number | null;
  /** True when pages were left unread because of `maxPages`. */
  truncated: boolean;
};

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

type Options = {
  signal?: AbortSignal;
  maxPages?: number;
  /** For tests: replaces `fetch` and the wait between pages. */
  fetchFn?: FetchLike;
  wait?: (ms: number) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const waitFor = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default async function fetchScryfallPages(
  firstUrl: string,
  {
    signal,
    maxPages = DEFAULT_MAX_PAGES,
    fetchFn = (url, init) => fetch(url, init),
    wait = waitFor,
  }: Options = {},
): Promise<ScryfallPages> {
  const data: unknown[] = [];
  let totalCards: number | null = null;
  let url: string | null = firstUrl;

  for (let page = 0; url && page < maxPages; page += 1) {
    if (page > 0) await wait(REQUEST_GAP_MS);

    const response = await fetchFn(url, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      throw new Error(`[API error] ${response.status} — ${response.statusText}`);
    }

    const json: unknown = await response.json();
    if (!isRecord(json) || !Array.isArray(json.data)) {
      throw new Error("[API error] Response did not contain a data list");
    }

    data.push(...json.data);
    if (typeof json.total_cards === "number") totalCards = json.total_cards;
    url =
      json.has_more === true && typeof json.next_page === "string"
        ? json.next_page
        : null;
  }

  return { data, totalCards, truncated: url !== null };
}
