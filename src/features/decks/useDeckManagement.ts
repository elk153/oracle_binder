import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../types/database.ts";
import {
  clearLocalRealtimeChange,
  markLocalRealtimeChange,
} from "../../services/localRealtimeChanges.ts";
import {
  binderCopiesQueryKey,
  deckCardsQueryKey,
} from "../queryKeys.ts";
import {
  applyChanges,
  patchLists,
  restoreLists,
  toOptimisticDeckEntry,
  updateById,
  type ListSnapshot,
} from "../optimisticCache.ts";
import { isUndoneError, type UndoWindow } from "../undoWindow.ts";
export { deckCardsQueryKey } from "../queryKeys.ts";

export type Deck = Tables<"decks">;
export type DeckCard = Tables<"deck_cards">;
export type NewDeckCard = Omit<TablesInsert<"deck_cards">, "user_id">;
export type DeckCardChanges = Pick<
  TablesUpdate<"deck_cards">,
  "deck_id" | "kind" | "binder_card_id"
>;

export const decksQueryKey = (userId?: string) =>
  ["decks", userId] as const;

type BinderCopyRow = Tables<"binder_cards">;

// Context for mutations whose database triggers also change Binder copies.
type MarkedContext = { copyIds: string[]; snapshots: ListSnapshot[] };

// Input of the D-079 entry actions; `copyIds` is filled in by `withCopyIds`.
type DeferredEntryAction = { ids: string[]; copyIds: string[]; undoWindow?: UndoWindow };

// A copy used by a Binder deck entry has no folder (D-034 exclusive storage).
function clearFolderOf(copyIds: string[]) {
  return updateById<BinderCopyRow>(copyIds, (copy) => ({ ...copy, binder_id: null }));
}

export default function useDeckManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const decksKey = useMemo(() => decksQueryKey(user?.id), [user?.id]);
  const deckCardsKey = useMemo(() => deckCardsQueryKey(user?.id), [user?.id]);
  const copiesKey = useMemo(() => binderCopiesQueryKey(user?.id), [user?.id]);

  const decksQuery = useQuery({
    queryKey: decksKey,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to load decks.");
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const deckCardsQuery = useQuery({
    queryKey: deckCardsKey,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to load deck cards.");
      const { data, error } = await supabase
        .from("deck_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const createDeck = useMutation<Deck, Error, string>({
    mutationFn: async (name) => {
      if (!user) throw new Error("Sign in to create a deck.");
      const { data, error } = await supabase
        .from("decks")
        .insert({ name: name.trim(), user_id: user.id })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (deck) =>
      queryClient.setQueryData<Deck[]>(decksKey, (current) =>
        current ? [...current, deck] : [deck],
      ),
  });

  // The mutations below (except createDeck) are optimistic (D-071): see the
  // comment in useBinderCopies.ts. Creating a deck stays a normal request,
  // because the caller needs the server's deck to continue.
  const renameDeck = useMutation<
    Deck,
    Error,
    { id: string; name: string },
    ListSnapshot[]
  >({
    mutationFn: async ({ id, name }) => {
      if (!user) throw new Error("Sign in to rename a deck.");
      const { data, error } = await supabase
        .from("decks")
        .update({ name: name.trim() })
        .eq("user_id", user.id)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: ({ id, name }) =>
      patchLists(queryClient, [
        [decksKey, updateById<Deck>([id], (deck) => ({ ...deck, name: name.trim() }))],
      ]),
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (updated) =>
      queryClient.setQueryData<Deck[]>(decksKey, (current) =>
        current?.map((deck) => (deck.id === updated.id ? updated : deck)),
      ),
  });

  const deleteDeck = useMutation<Deck, Error, string, MarkedContext>({
    mutationFn: async (id) => {
      if (!user) throw new Error("Sign in to delete a deck.");
      const { data, error } = await supabase
        .from("decks")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    // The deck and its entries go; the database also frees the deck's
    // Binder copies (they become Loose), so the copies are refetched.
    onMutate: (id) =>
      markAndPatch(
        copyIdsOfEntries((entry) => entry.deck_id === id),
        [
          [decksKey, (current: Deck[]) => current.filter((deck) => deck.id !== id)],
          [deckCardsKey, (current: DeckCard[]) => current.filter((entry) => entry.deck_id !== id)],
        ],
      ),
    onError: (_error, _id, context) => undoMarkAndPatch(context),
    onSettled: () => refetchBinderCopies(),
  });

  const addDeckCard = useMutation<DeckCard, Error, NewDeckCard, ListSnapshot[]>({
    mutationFn: async (entry) => {
      if (!user) throw new Error("Sign in to add a card to a deck.");
      const copyIds =
        entry.kind === "binder" && entry.binder_card_id
          ? [entry.binder_card_id]
          : [];
      markLocalRealtimeChange("binder_cards", user.id, copyIds);
      try {
        // The caller may choose the id, so the optimistic row and the saved
        // row are the same row.
        const { data, error } = await supabase
          .from("deck_cards")
          .insert({ ...entry, id: entry.id ?? crypto.randomUUID(), user_id: user.id })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, copyIds);
        throw error;
      }
    },
    // A Binder entry takes its copy out of its folder (database trigger).
    onMutate: (entry) => {
      if (!user || !entry.id) return [];
      const optimistic = toOptimisticDeckEntry(
        {
          id: entry.id,
          deck_id: entry.deck_id,
          kind: entry.kind,
          binder_card_id: entry.binder_card_id ?? null,
          scryfall_id: entry.scryfall_id,
        },
        user.id,
      );
      return patchLists(queryClient, [
        [deckCardsKey, (current: DeckCard[]) => [...current, optimistic]],
        ...(entry.kind === "binder" && entry.binder_card_id
          ? [[copiesKey, clearFolderOf([entry.binder_card_id])] as const]
          : []),
      ]);
    },
    onError: (_error, _entry, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (entry) => replaceDeckCards([entry]),
    onSettled: (_entry, _error, input) => {
      if (input.binder_card_id) refetchBinderCopies();
    },
  });

  const updateDeckCard = useMutation<
    DeckCard,
    Error,
    { id: string; changes: DeckCardChanges },
    MarkedContext
  >({
    mutationFn: async ({ id, changes }) => {
      if (!user) throw new Error("Sign in to update a deck card.");
      const { data, error } = await supabase
        .from("deck_cards")
        .update(changes)
        .eq("user_id", user.id)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    // The old and the new Binder copy both end up without a folder
    // (database trigger): one is released to Loose, the other is in the deck.
    onMutate: ({ id, changes }) => {
      const copyIds = [
        ...copyIdsOfEntries((entry) => entry.id === id),
        ...(changes.kind === "binder" && changes.binder_card_id ? [changes.binder_card_id] : []),
      ];
      return markAndPatch(copyIds, [
        [deckCardsKey, updateById<DeckCard>([id], (entry) => applyChanges(entry, changes))],
        [copiesKey, clearFolderOf(copyIds)],
      ]);
    },
    onError: (_error, _input, context) => undoMarkAndPatch(context),
    onSuccess: (updated) => replaceDeckCards([updated]),
    onSettled: () => refetchBinderCopies(),
  });

  // Deletes deck entries, either by their own ids or by the binder copies
  // they reference (`by: "binder_card_id"`). Deleting a Binder entry releases
  // its copy to Loose (database trigger), so the copies are invalidated too.
  // Used by the scanner's Undo (D-064).
  const deleteDeckCards = useMutation<
    DeckCard[],
    Error,
    { by: "id" | "binder_card_id"; values: string[] },
    MarkedContext
  >({
    mutationFn: async ({ by, values }) => {
      if (!user) throw new Error("Sign in to remove deck cards.");
      if (values.length === 0) return [];
      const { data, error } = await supabase
        .from("deck_cards")
        .delete()
        .eq("user_id", user.id)
        .in(by, values)
        .select("*");
      if (error) throw error;
      return data;
    },
    onMutate: ({ by, values }) => {
      const removed = new Set(values);
      const copyIds =
        by === "binder_card_id"
          ? values
          : copyIdsOfEntries((entry) => removed.has(entry.id));
      return markAndPatch(copyIds, [
        [
          deckCardsKey,
          (current: DeckCard[]) =>
            current.filter((entry) => {
              const key = by === "id" ? entry.id : entry.binder_card_id;
              return !(key && removed.has(key));
            }),
        ],
      ]);
    },
    onError: (_error, _input, context) => undoMarkAndPatch(context),
    onSettled: (deleted) => {
      if (deleted?.some((entry) => entry.binder_card_id)) refetchBinderCopies();
    },
  });

  // D-079 "Remove from deck": the entries leave the deck, and their owned
  // copies go to the folder the user chose (null = Loose), in one database
  // transaction (remove_deck_entries). Returns the moved copies.
  // D-079 "Delete" in Decks: the entries are deleted, and so are the owned
  // copies they use: the card leaves the collection (delete_deck_entries).
  //
  // Both take an optional `undoWindow` (undoWindow.ts): the screen changes at
  // once, the request waits 8 s, and Undo restores the lists unsent. The
  // copy ids are worked out by the wrappers returned below, *before* the
  // optimistic patch removes the entries, and marked for the Realtime echo
  // filter only when the request is sent (the marks last 10 s).
  const removeDeckEntries = useMutation<
    BinderCopyRow[],
    Error,
    DeferredEntryAction & { binderId: string | null },
    MarkedContext
  >({
    mutationFn: async ({ ids, binderId, copyIds, undoWindow }) => {
      if (!user) throw new Error("Sign in to remove cards from a deck.");
      if (ids.length === 0) return [];
      await undoWindow?.wait;
      markLocalRealtimeChange("binder_cards", user.id, copyIds);
      const { data, error } = await supabase.rpc("remove_deck_entries", {
        p_entry_ids: ids,
        p_binder_id: binderId,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async ({ ids, binderId, copyIds }) => {
      const removed = new Set(ids);
      return {
        copyIds,
        snapshots: await patchLists(queryClient, [
          [deckCardsKey, (current: DeckCard[]) => current.filter((entry) => !removed.has(entry.id))],
          [copiesKey, updateById<BinderCopyRow>(copyIds, (copy) => ({ ...copy, binder_id: binderId }))],
        ]),
      };
    },
    onError: (_error, _input, context) => undoMarkAndPatch(context),
    onSuccess: (moved) => replaceBinderCopies(moved),
    onSettled: (_data, error) => refetchAfterDeferred(error),
  });

  const deleteDeckEntries = useMutation<void, Error, DeferredEntryAction, MarkedContext>({
    mutationFn: async ({ ids, copyIds, undoWindow }) => {
      if (!user) throw new Error("Sign in to delete deck cards.");
      if (ids.length === 0) return;
      await undoWindow?.wait;
      markLocalRealtimeChange("binder_cards", user.id, copyIds);
      const { error } = await supabase.rpc("delete_deck_entries", { p_entry_ids: ids });
      if (error) throw error;
    },
    onMutate: async ({ ids, copyIds }) => {
      const deleted = new Set(ids);
      const deletedCopies = new Set(copyIds);
      return {
        copyIds,
        snapshots: await patchLists(queryClient, [
          [deckCardsKey, (current: DeckCard[]) => current.filter((entry) => !deleted.has(entry.id))],
          [copiesKey, (current: BinderCopyRow[]) => current.filter((copy) => !deletedCopies.has(copy.id))],
        ]),
      };
    },
    onError: (_error, _input, context) => undoMarkAndPatch(context),
    onSettled: (_data, error) => refetchAfterDeferred(error),
  });

  // The copies used by these entries, read from the cache before the patch.
  function withCopyIds<T extends { ids: string[] }>(input: T): T & { copyIds: string[] } {
    const ids = new Set(input.ids);
    return { ...input, copyIds: copyIdsOfEntries((entry) => ids.has(entry.id)) };
  }

  // Binder copies used by the cached deck entries that match `test`. Read
  // in onMutate, *before* the optimistic patch changes the entries.
  function copyIdsOfEntries(test: (entry: DeckCard) => boolean): string[] {
    return (queryClient.getQueryData<DeckCard[]>(deckCardsKey) ?? []).flatMap((entry) =>
      test(entry) && entry.binder_card_id ? [entry.binder_card_id] : [],
    );
  }

  // The database triggers of these requests also change Binder copies. Their
  // ids are marked first, so the Realtime echo of our own change does not
  // trigger an extra refetch (localRealtimeChanges.ts), then the lists are
  // patched.
  async function markAndPatch(
    copyIds: string[],
    patches: Parameters<typeof patchLists>[1],
  ): Promise<MarkedContext> {
    if (user) markLocalRealtimeChange("binder_cards", user.id, copyIds);
    return { copyIds, snapshots: await patchLists(queryClient, patches) };
  }

  function undoMarkAndPatch(context: MarkedContext | undefined) {
    if (!context) return;
    if (user) clearLocalRealtimeChange("binder_cards", user.id, context.copyIds);
    restoreLists(queryClient, context.snapshots);
  }

  // Puts the server's version of these entries in the cached list.
  function replaceDeckCards(rows: DeckCard[]) {
    const byId = new Map(rows.map((row) => [row.id, row]));
    queryClient.setQueryData<DeckCard[]>(deckCardsKey, (current) => {
      if (!current) return rows;
      const missing = rows.filter((row) => !current.some((entry) => entry.id === row.id));
      return [...current.map((entry) => byId.get(entry.id) ?? entry), ...missing];
    });
  }

  // Puts the server's version of these Binder copies in the cached list.
  function replaceBinderCopies(rows: BinderCopyRow[]) {
    const byId = new Map(rows.map((row) => [row.id, row]));
    queryClient.setQueryData<BinderCopyRow[]>(copiesKey, (current) =>
      current?.map((copy) => byId.get(copy.id) ?? copy),
    );
  }

  // Background refetch, not awaited: the buttons unlock after the write.
  function refetchBinderCopies() {
    void queryClient.invalidateQueries({ queryKey: copiesKey });
  }

  // After a deferred (undo window) request: nothing to do when it was undone,
  // otherwise refetch both lists (a refetch during the window may have
  // brought the old rows back).
  function refetchAfterDeferred(error: Error | null) {
    if (isUndoneError(error)) return;
    void queryClient.invalidateQueries({ queryKey: deckCardsKey });
    refetchBinderCopies();
  }

  return {
    decks: decksQuery.data ?? [],
    deckCards: deckCardsQuery.data ?? [],
    error: decksQuery.error ?? deckCardsQuery.error ?? null,
    isLoading: decksQuery.isLoading || deckCardsQuery.isLoading,
    isPending:
      createDeck.isPending ||
      renameDeck.isPending ||
      deleteDeck.isPending ||
      addDeckCard.isPending ||
      updateDeckCard.isPending ||
      deleteDeckCards.isPending,
    // removeDeckEntries and deleteDeckEntries are left out of isPending on
    // purpose: with an undo window they stay pending for 8 s, and the page's
    // buttons must not be locked that long.
    createDeck: createDeck.mutateAsync,
    renameDeck: renameDeck.mutateAsync,
    deleteDeck: deleteDeck.mutateAsync,
    addDeckCard: addDeckCard.mutateAsync,
    updateDeckCard: updateDeckCard.mutateAsync,
    deleteDeckCards: deleteDeckCards.mutateAsync,
    removeDeckEntries: (input: { ids: string[]; binderId: string | null; undoWindow?: UndoWindow }) =>
      removeDeckEntries.mutateAsync(withCopyIds(input)),
    deleteDeckEntries: (input: { ids: string[]; undoWindow?: UndoWindow }) =>
      deleteDeckEntries.mutateAsync(withCopyIds(input)),
  };
}

export type DeckActions = ReturnType<typeof useDeckManagement>;
