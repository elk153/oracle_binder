import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Tables, TablesInsert } from "../types/database.ts";

// Helpers for optimistic updates of list queries (D-071, issue #35).
//
// An optimistic update changes the cached list *before* the server answers,
// so the screen reacts at once. It keeps a snapshot of the list it changed;
// if the server refuses, the snapshot goes back (rollback).
//
// Use in a TanStack Query mutation:
//   onMutate:  return patchLists(queryClient, [[key, (list) => newList], ...])
//   onError:   restoreLists(queryClient, context)
//   onSettled: refetch the lists the database may also have changed (triggers)

/** What `restoreLists` needs to undo one patched list. */
export type ListSnapshot = {
  queryKey: QueryKey;
  previous: unknown[] | undefined;
};

/**
 * One list to patch: its query key and a function from old to new list.
 * `never[]` as the parameter type accepts an updater for any row type (a
 * function that takes `BinderCopy[]` can be used where `never[]` is passed).
 */
export type ListPatch = readonly [QueryKey, (items: never[]) => unknown[]];

/**
 * Patches cached lists at once and returns their snapshots.
 * - Running fetches of these lists are cancelled first, so a response that
 *   left the server before our change cannot overwrite it.
 * - A list that is not loaded yet is left alone: there is nothing on screen
 *   to update, and the next fetch brings the server's version.
 */
export async function patchLists(
  queryClient: QueryClient,
  patches: ReadonlyArray<ListPatch>,
): Promise<ListSnapshot[]> {
  await Promise.all(
    patches.map(([queryKey]) => queryClient.cancelQueries({ queryKey })),
  );
  return patches.map(([queryKey, update]) => {
    const previous = queryClient.getQueryData<never[]>(queryKey);
    if (previous !== undefined) {
      queryClient.setQueryData(queryKey, update(previous));
    }
    return { queryKey, previous };
  });
}

/** Puts the snapshots from `patchLists` back (after a failed request). */
export function restoreLists(
  queryClient: QueryClient,
  snapshots: ListSnapshot[] | undefined,
) {
  for (const { queryKey, previous } of snapshots ?? []) {
    if (previous !== undefined) {
      queryClient.setQueryData(queryKey, previous);
    }
  }
}

/** Replaces the rows whose `id` matches, using `change`. */
export function updateById<T extends { id: string }>(
  ids: Iterable<string>,
  change: (item: T) => T,
): (items: T[]) => T[] {
  const idSet = new Set(ids);
  return (items) => items.map((item) => (idSet.has(item.id) ? change(item) : item));
}

/** A temporary id for a row the server creates with its own id. */
export function temporaryId(): string {
  return `optimistic-${crypto.randomUUID()}`;
}

/**
 * Applies a change set to a row, skipping keys whose value is `undefined`
 * (an absent form field must not blank a column).
 */
export function applyChanges<T extends object>(item: T, changes: object): T {
  const defined = Object.entries(changes).filter(([, value]) => value !== undefined);
  return { ...item, ...Object.fromEntries(defined) };
}

type BinderCopyRow = Tables<"binder_cards">;
export type DeckEntry = Tables<"deck_cards">;

/**
 * The row a new Binder copy will have, built in the browser for the
 * optimistic update. Database defaults (timestamps, empty fields) are filled
 * in here; the server's row replaces it once the insert returns.
 */
export function toOptimisticCopy(
  copy: Omit<TablesInsert<"binder_cards">, "user_id"> & { id: string },
  userId: string,
): BinderCopyRow {
  const now = new Date().toISOString();
  return {
    id: copy.id,
    user_id: userId,
    scryfall_id: copy.scryfall_id,
    rarity: copy.rarity,
    status: copy.status,
    binder_id: copy.binder_id ?? null,
    acquired_at: copy.acquired_at ?? null,
    acquisition_format: copy.acquisition_format ?? null,
    acquisition_type: copy.acquisition_type ?? null,
    condition: copy.condition ?? null,
    disposal_price: copy.disposal_price ?? null,
    disposed_at: copy.disposed_at ?? null,
    finish: copy.finish ?? null,
    language: copy.language ?? null,
    location: copy.location ?? null,
    notes: copy.notes ?? null,
    purchase_price: copy.purchase_price ?? null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * The row a new deck entry will have. Without an `id`, it gets a temporary
 * one: the background refetch after the request replaces the row.
 */
export function toOptimisticDeckEntry(
  entry: Pick<DeckEntry, "deck_id" | "kind" | "binder_card_id" | "scryfall_id"> & { id?: string },
  userId: string,
): DeckEntry {
  const now = new Date().toISOString();
  return {
    id: entry.id ?? temporaryId(),
    user_id: userId,
    deck_id: entry.deck_id,
    kind: entry.kind,
    binder_card_id: entry.binder_card_id,
    scryfall_id: entry.scryfall_id,
    created_at: now,
    updated_at: now,
  };
}

/**
 * A deck's Binder entry that loses its copy stays in the deck as a virtual
 * card (the database does the same when a copy is removed, disposed or moved
 * out of the deck). Takes an array, not any iterable: a single string is
 * iterable too, and would be read as a list of characters.
 */
export function releaseDeckEntriesOf(
  copyIds: readonly string[],
): (entries: DeckEntry[]) => DeckEntry[] {
  const released = new Set(copyIds);
  return (entries) =>
    entries.map((entry) =>
      entry.binder_card_id !== null && released.has(entry.binder_card_id) && entry.kind === "binder"
        ? { ...entry, kind: "virtual", binder_card_id: null }
        : entry,
    );
}

type Row = { id: string; binder_card_id?: string | null };

/**
 * Puts back only the rows an action touched, from its snapshots, and keeps
 * every other row as it is now. `restoreLists` puts back whole lists, which
 * is wrong once several actions overlap (D-080: several undo windows can be
 * open at once): undoing the older action would restore a list without the
 * newer action's change, and undoing the newer one would then bring back a
 * list without the older one's row.
 *
 * `touchedIds` are the ids the action changed (copies and/or deck entries).
 * A row counts as touched when its own id is listed, or, for deck entries,
 * when it used a listed copy (`binder_card_id`). Restored rows go back to
 * their old place, after the nearest row that came before them.
 */
export function restoreRows(
  queryClient: QueryClient,
  snapshots: ListSnapshot[] | undefined,
  touchedIds: Iterable<string>,
) {
  const touched = new Set(touchedIds);
  for (const { queryKey, previous } of snapshots ?? []) {
    if (previous === undefined) continue;
    const before = previous as Row[];
    const rows = before.filter(
      (row) => touched.has(row.id) || (row.binder_card_id != null && touched.has(row.binder_card_id)),
    );
    if (rows.length === 0) continue;
    queryClient.setQueryData<Row[]>(queryKey, (current) =>
      current ? putBack(current, before, rows) : current,
    );
  }
}

function putBack(current: Row[], before: Row[], rows: Row[]): Row[] {
  const replaced = new Set(rows.map((row) => row.id));
  const result = current.filter((row) => !replaced.has(row.id));
  for (const row of rows) {
    const oldIndex = before.findIndex((entry) => entry.id === row.id);
    let at = 0;
    for (let i = oldIndex - 1; i >= 0; i--) {
      const found = result.findIndex((entry) => entry.id === before[i].id);
      if (found !== -1) {
        at = found + 1;
        break;
      }
    }
    result.splice(at, 0, row);
  }
  return result;
}
