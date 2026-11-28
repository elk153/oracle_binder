// D-074: reading every page of a Scryfall list.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import fetchScryfallPages from "../../src/services/fetchScryfallPages.ts";

/** A fake Scryfall: `pages` lists the card ids on each page. */
function fakeScryfall(pages: string[][]) {
  const requested: string[] = [];
  const fetchFn = async (url: string) => {
    requested.push(url);
    const index = Number(new URL(url).searchParams.get("page") ?? "1") - 1;
    const hasMore = index < pages.length - 1;
    const body = {
      object: "list",
      total_cards: pages.flat().length,
      has_more: hasMore,
      ...(hasMore ? { next_page: `https://api.example/cards?page=${index + 2}` } : {}),
      data: pages[index].map((id) => ({ id })),
    };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return { fetchFn, requested };
}

const noWait = async () => {};

test("follows next_page until the last page", async () => {
  const { fetchFn, requested } = fakeScryfall([["a", "b"], ["c"], ["d"]]);
  const result = await fetchScryfallPages("https://api.example/cards", { fetchFn, wait: noWait });
  assert.deepEqual(result.data, [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
  assert.equal(result.totalCards, 4);
  assert.equal(result.truncated, false);
  assert.equal(requested.length, 3);
});

test("stops at maxPages and says the list was cut", async () => {
  const { fetchFn, requested } = fakeScryfall([["a"], ["b"], ["c"]]);
  const result = await fetchScryfallPages("https://api.example/cards", {
    fetchFn,
    wait: noWait,
    maxPages: 2,
  });
  assert.deepEqual(result.data, [{ id: "a" }, { id: "b" }]);
  assert.equal(result.totalCards, 3);
  assert.equal(result.truncated, true);
  assert.equal(requested.length, 2);
});

test("waits between pages, not before the first", async () => {
  const { fetchFn } = fakeScryfall([["a"], ["b"], ["c"]]);
  const waits: number[] = [];
  await fetchScryfallPages("https://api.example/cards", {
    fetchFn,
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(waits.length, 2);
  assert.ok(waits.every((ms) => ms >= 50), "Scryfall asks for 50–100 ms between requests");
});

test("an HTTP error or a response without a data list throws", async () => {
  await assert.rejects(
    fetchScryfallPages("https://api.example/cards", {
      fetchFn: async () => new Response("{}", { status: 503, statusText: "Unavailable" }),
    }),
    /503/,
  );
  await assert.rejects(
    fetchScryfallPages("https://api.example/cards", {
      fetchFn: async () => new Response(JSON.stringify({ object: "error" }), { status: 200 }),
    }),
    /data list/,
  );
});
