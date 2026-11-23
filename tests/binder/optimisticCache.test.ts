// D-071: optimistic Binder/Deck updates (src/features/optimisticCache.ts).
//
// Run from the repository root (Node 22):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"
//
// The helpers are tested on their own, and through a real TanStack Query
// mutation (MutationObserver from @tanstack/query-core, already installed with
// @tanstack/react-query): the list must change before the request finishes,
// and go back when the request fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MutationObserver, QueryClient } from "@tanstack/query-core";
import {
  applyChanges,
  patchLists,
  releaseDeckEntriesOf,
  restoreLists,
  temporaryId,
  toOptimisticCopy,
  toOptimisticDeckEntry,
  updateById,
  type DeckEntry,
  type ListSnapshot,
} from "../../src/features/optimisticCache.ts";

type Row = { id: string; name: string; binder_id: string | null };

const copiesKey = ["binderCopies", "user-1"];
const deckKey = ["deckCards", "user-1"];

function entry(id: string, kind: string, copyId: string | null): DeckEntry {
  return toOptimisticDeckEntry(
    { id, deck_id: "deck-1", kind, binder_card_id: copyId, scryfall_id: "card-1" },
    "user-1",
  );
}

test("applyChanges skips undefined values and keeps null", () => {
  const row: Row = { id: "a", name: "old", binder_id: "b1" };
  assert.deepEqual(applyChanges(row, { name: undefined, binder_id: null }), {
    id: "a",
    name: "old",
    binder_id: null,
  });
});

test("updateById changes only the listed rows", () => {
  const rows: Row[] = [
    { id: "a", name: "A", binder_id: null },
    { id: "b", name: "B", binder_id: null },
  ];
  const next = updateById<Row>(["b"], (row) => ({ ...row, name: "changed" }))(rows);
  assert.equal(next[0], rows[0]);
  assert.equal(next[1].name, "changed");
});

test("releaseDeckEntriesOf turns the copy's Binder entry into a virtual card", () => {
  const entries = [entry("e1", "binder", "c1"), entry("e2", "binder", "c2"), entry("e3", "proxy", null)];
  const next = releaseDeckEntriesOf(["c1"])(entries);
  assert.equal(next[0].kind, "virtual");
  assert.equal(next[0].binder_card_id, null);
  assert.equal(next[1], entries[1]);
  assert.equal(next[2], entries[2]);
});

test("releaseDeckEntriesOf releases several copies at once (D-079 bulk)", () => {
  const entries = [
    entry("e1", "binder", "c1"),
    entry("e2", "binder", "c2"),
    entry("e3", "binder", "c3"),
    entry("e4", "virtual", null),
  ];
  const next = releaseDeckEntriesOf(["c1", "c3"])(entries);
  assert.deepEqual(
    next.map((row) => [row.kind, row.binder_card_id]),
    [
      ["virtual", null],
      ["binder", "c2"],
      ["virtual", null],
      ["virtual", null],
    ],
  );
  assert.equal(next[1], entries[1]);
  assert.equal(next[3], entries[3]);
});

test("toOptimisticCopy fills database defaults and keeps the given id", () => {
  const copy = toOptimisticCopy(
    { id: "c1", scryfall_id: "card-1", rarity: "rare", status: "owned", finish: "foil" },
    "user-1",
  );
  assert.equal(copy.id, "c1");
  assert.equal(copy.user_id, "user-1");
  assert.equal(copy.finish, "foil");
  assert.equal(copy.binder_id, null);
  assert.equal(copy.notes, null);
  assert.ok(!Number.isNaN(Date.parse(copy.created_at)));
});

test("temporary deck entry ids cannot collide with database ids", () => {
  const id = toOptimisticDeckEntry(
    { deck_id: "d", kind: "binder", binder_card_id: "c", scryfall_id: "s" },
    "u",
  ).id;
  assert.match(id, /^optimistic-/);
  assert.notEqual(temporaryId(), temporaryId());
});

test("patchLists patches loaded lists, skips missing ones, restoreLists undoes", async () => {
  const client = new QueryClient();
  const rows: Row[] = [{ id: "a", name: "A", binder_id: "b1" }];
  client.setQueryData(copiesKey, rows);

  const snapshots = await patchLists(client, [
    [copiesKey, updateById<Row>(["a"], (row) => ({ ...row, binder_id: null }))],
    [deckKey, () => [entry("never", "binder", "a")]],
  ]);

  assert.equal(client.getQueryData<Row[]>(copiesKey)?.[0].binder_id, null);
  assert.equal(client.getQueryData(deckKey), undefined, "a list that is not loaded stays unloaded");

  restoreLists(client, snapshots);
  assert.deepEqual(client.getQueryData(copiesKey), rows);
});

// A mutation shaped like the ones in useBinderCopies.ts / useDeckManagement.ts.
function removeCopyMutation(client: QueryClient, request: () => Promise<void>) {
  return new MutationObserver<void, Error, string, ListSnapshot[]>(client, {
    mutationFn: request,
    onMutate: (copyId) =>
      patchLists(client, [
        [copiesKey, (current: Row[]) => current.filter((row) => row.id !== copyId)],
        [deckKey, releaseDeckEntriesOf([copyId])],
      ]),
    onError: (_error, _copyId, snapshots) => restoreLists(client, snapshots),
  });
}

function loadLists(client: QueryClient) {
  client.setQueryData<Row[]>(copiesKey, [
    { id: "c1", name: "Copy 1", binder_id: null },
    { id: "c2", name: "Copy 2", binder_id: null },
  ]);
  client.setQueryData<DeckEntry[]>(deckKey, [entry("e1", "binder", "c1")]);
}

test("a mutation changes both lists before the request finishes", async () => {
  const client = new QueryClient();
  loadLists(client);
  let finishRequest = () => {};
  const request = () => new Promise<void>((resolve) => { finishRequest = resolve; });

  const running = removeCopyMutation(client, request).mutate("c1");
  await new Promise((resolve) => setTimeout(resolve, 0)); // let onMutate run

  assert.deepEqual(client.getQueryData<Row[]>(copiesKey)?.map((row) => row.id), ["c2"]);
  assert.equal(client.getQueryData<DeckEntry[]>(deckKey)?.[0].kind, "virtual");

  finishRequest();
  await running;
  assert.deepEqual(client.getQueryData<Row[]>(copiesKey)?.map((row) => row.id), ["c2"]);
});

test("a failed mutation puts both lists back", async () => {
  const client = new QueryClient();
  loadLists(client);
  const before = {
    copies: client.getQueryData(copiesKey),
    deck: client.getQueryData(deckKey),
  };

  await assert.rejects(
    removeCopyMutation(client, () => Promise.reject(new Error("refused"))).mutate("c1"),
    /refused/,
  );

  // Same content (TanStack Query may rebuild the array: structural sharing).
  assert.deepEqual(client.getQueryData(copiesKey), before.copies);
  assert.deepEqual(client.getQueryData(deckKey), before.deck);
});
