import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../../types/database.ts";
import useRealtimeInvalidation from "../../hooks/useRealtimeInvalidation.ts";
import { clearLocalRealtimeChange, markLocalRealtimeChange } from "../../services/localRealtimeChanges.ts";
import {
  applyChanges,
  patchLists,
  releaseDeckEntriesOf,
  restoreLists,
  toOptimisticCopy,
  toOptimisticDeckEntry,
  updateById,
  type DeckEntry,
  type ListSnapshot,
} from "../optimisticCache.ts";
import { isUndoneError, type UndoWindow } from "../undoWindow.ts";
import {
  binderCopiesQueryKey,
  deckCardsQueryKey,
} from "../queryKeys.ts";
export { binderCopiesQueryKey } from "../queryKeys.ts";

const BINDER_COPIES_PAGE_SIZE = 500;

export type BinderCopy = Tables<"binder_cards">;
export type NewBinderCopy = Omit<TablesInsert<"binder_cards">, "user_id">;
export type BinderCopyUpdate = TablesUpdate<"binder_cards">;
export type BinderCopyDisposalChanges = Omit<
  BinderCopyUpdate,
  | "created_at"
  | "disposed_at"
  | "disposal_price"
  | "id"
  | "rarity"
  | "scryfall_id"
  | "status"
  | "updated_at"
  | "user_id"
>;

type RemoveOrDisposeBinderCopy = {
  id: string;
  status: "sold" | "lost" | "given_away" | null;
  changes?: BinderCopyDisposalChanges;
};

type AddBinderCopyToDeck = {
  copy: NewBinderCopy;
  deckId: string;
};

type MoveBinderCopyLocation = {
  id: string;
  binderId: string | null;
  deckId: string | null;
  changes: BinderCopyUpdate;
};

async function fetchBinderCopies(userId: string): Promise<BinderCopy[]> {
  const copies: BinderCopy[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("binder_cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + BINDER_COPIES_PAGE_SIZE - 1);
    if (error) throw error;

    copies.push(...data);
    if (data.length < BINDER_COPIES_PAGE_SIZE) return copies;
    offset += BINDER_COPIES_PAGE_SIZE;
  }
}

export default function useBinderCopies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => binderCopiesQueryKey(user?.id),
    [user?.id],
  );
  const deckKey = useMemo(() => deckCardsQueryKey(user?.id), [user?.id]);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("Sign in to load binder copies.");
      return fetchBinderCopies(user.id);
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const realtimeError = useRealtimeInvalidation({
    table: "binder_cards",
    userId: user?.id,
    queryKey,
  });

  const copiesByScryfallId = useMemo(() => {
    const copies = new Map<string, BinderCopy[]>();
    for (const copy of query.data ?? []) {
      const current = copies.get(copy.scryfall_id) ?? [];
      current.push(copy);
      copies.set(copy.scryfall_id, current);
    }
    return copies;
  }, [query.data]);

  // Every mutation below is optimistic (D-071): `onMutate` changes the cached
  // lists the way the database will, so the Binder/Deck icons and lists react
  // at once; `onError` restores the snapshots; `onSuccess` swaps in the row
  // the server returned; `onSettled` refetches the deck entries in the
  // background when database triggers may have changed them. The refetch is
  // not awaited, so the buttons unlock after the one write request.

  const addCopy = useMutation<
    BinderCopy,
    Error,
    NewBinderCopy,
    ListSnapshot[]
  >({
    mutationFn: async (copy) => {
      if (!user) throw new Error("Sign in to add a binder copy.");
      // The caller may choose the id, so the optimistic row and the saved
      // row are the same row.
      const id = copy.id ?? crypto.randomUUID();
      markLocalRealtimeChange("binder_cards", user.id, [id]);
      try {
        const { data, error } = await supabase
          .from("binder_cards")
          .insert({ ...copy, id, user_id: user.id })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, [id]);
        throw error;
      }
    },
    onMutate: (copy) => {
      if (!user || !copy.id) return [];
      const optimistic = toOptimisticCopy({ ...copy, id: copy.id }, user.id);
      return patchLists(queryClient, [
        [queryKey, (current: BinderCopy[]) => [...current, optimistic]],
      ]);
    },
    onError: (_error, _copy, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (copy) => replaceCopies([copy]),
  });

  const addCopyToDeck = useMutation<
    BinderCopy,
    Error,
    AddBinderCopyToDeck,
    ListSnapshot[]
  >({
    mutationFn: async ({ copy, deckId }) => {
      if (!user) throw new Error("Sign in to add a binder copy.");
      const id = copy.id ?? crypto.randomUUID();
      markLocalRealtimeChange("binder_cards", user.id, [id]);
      try {
        const { data, error } = await supabase.rpc("add_binder_copy_to_deck", {
          p_copy_id: id,
          p_deck_id: deckId,
          p_scryfall_id: copy.scryfall_id,
          p_rarity: copy.rarity,
          p_copy_changes: {
            acquisition_type: copy.acquisition_type ?? null,
            acquisition_format: copy.acquisition_format ?? null,
            condition: copy.condition ?? null,
            finish: copy.finish ?? null,
            language: copy.language ?? null,
            purchase_price: copy.purchase_price ?? null,
            acquired_at: copy.acquired_at ?? null,
            location: copy.location ?? null,
            notes: copy.notes ?? null,
          },
        });
        if (error) throw error;
        const [copyResult] = data ?? [];
        if (!copyResult) throw new Error("The new binder copy was not returned.");
        return copyResult;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, [id]);
        throw error;
      }
    },
    // The database function creates the copy (no folder: it is in the deck)
    // and a Binder entry in the deck.
    onMutate: ({ copy, deckId }) => {
      if (!user || !copy.id) return [];
      const optimistic = toOptimisticCopy(
        { ...copy, id: copy.id, binder_id: null },
        user.id,
      );
      const entry = toOptimisticDeckEntry(
        { deck_id: deckId, kind: "binder", binder_card_id: copy.id, scryfall_id: copy.scryfall_id },
        user.id,
      );
      return patchLists(queryClient, [
        [queryKey, (current: BinderCopy[]) => [...current, optimistic]],
        [deckKey, (current: DeckEntry[]) => [...current, entry]],
      ]);
    },
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (copy) => replaceCopies([copy]),
    onSettled: () => refetchDeckEntries(),
  });

  const updateCopy = useMutation<
    BinderCopy,
    Error,
    { id: string; changes: BinderCopyUpdate },
    ListSnapshot[]
  >({
    mutationFn: async ({ id, changes }) => {
      if (!user) throw new Error("Sign in to update a binder copy.");
      markLocalRealtimeChange("binder_cards", user.id, [id]);
      try {
        const { data, error } = await supabase
          .from("binder_cards")
          .update(changes)
          .eq("user_id", user.id)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, [id]);
        throw error;
      }
    },
    onMutate: ({ id, changes }) =>
      patchLists(queryClient, [
        [queryKey, updateById<BinderCopy>([id], (copy) => applyChanges(copy, changes))],
      ]),
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (updated) => replaceCopies([updated]),
  });

  const removeOrDisposeCopy = useMutation<
    void,
    Error,
    RemoveOrDisposeBinderCopy,
    ListSnapshot[]
  >({
    mutationFn: async ({ id, status, changes = {} }) => {
      if (!user) throw new Error("Sign in to remove or dispose a binder copy.");
      markLocalRealtimeChange("binder_cards", user.id, [id]);
      try {
        const { error } = await supabase.rpc("remove_or_dispose_binder_copy", {
          p_copy_id: id,
          p_disposal_status: status,
          p_copy_changes: changes,
        });
        if (error) throw error;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, [id]);
        throw error;
      }
    },
    // Deleted copies leave the list; disposed copies keep their row with the
    // new status. Either way, a deck entry using the copy becomes a virtual
    // card (remove_or_dispose_binder_copy in the database).
    onMutate: ({ id, status, changes = {} }) =>
      patchLists(queryClient, [
        [
          queryKey,
          status === null
            ? (current: BinderCopy[]) => current.filter((copy) => copy.id !== id)
            : updateById<BinderCopy>([id], (copy) => ({
                ...applyChanges(copy, changes),
                status,
                disposed_at: new Date().toISOString(),
              })),
        ],
        [deckKey, releaseDeckEntriesOf([id])],
      ]),
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSettled: () => refetchDeckEntries(),
  });

  // D-079 bulk actions. One request for the whole list: the database
  // function changes all copies or none (delete_binder_copies,
  // dispose_binder_copies). Deck entries using the copies become virtual.
  // With an `undoWindow`, the screen changes at once but the request waits
  // for it (8 s); Undo rejects the wait and onError restores the lists. The
  // Realtime echo marks are set only when the request is sent (they last
  // 10 s). After the request, both lists are refetched: a refetch during the
  // window may have brought the old rows back.
  const deleteCopies = useMutation<
    void,
    Error,
    { ids: string[]; undoWindow?: UndoWindow },
    ListSnapshot[]
  >({
    mutationFn: async ({ ids, undoWindow }) => {
      if (!user) throw new Error("Sign in to delete binder copies.");
      if (ids.length === 0) return;
      await undoWindow?.wait;
      markLocalRealtimeChange("binder_cards", user.id, ids);
      try {
        const { error } = await supabase.rpc("delete_binder_copies", { p_copy_ids: ids });
        if (error) throw error;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, ids);
        throw error;
      }
    },
    onMutate: ({ ids }) => {
      const deleted = new Set(ids);
      return patchLists(queryClient, [
        [queryKey, (current: BinderCopy[]) => current.filter((copy) => !deleted.has(copy.id))],
        [deckKey, releaseDeckEntriesOf(ids)],
      ]);
    },
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSettled: (_data, error) => refetchAfterDeferred(error),
  });

  const disposeCopies = useMutation<
    BinderCopy[],
    Error,
    { ids: string[]; status: "sold" | "lost" | "given_away"; undoWindow?: UndoWindow },
    ListSnapshot[]
  >({
    mutationFn: async ({ ids, status, undoWindow }) => {
      if (!user) throw new Error("Sign in to dispose binder copies.");
      if (ids.length === 0) return [];
      await undoWindow?.wait;
      markLocalRealtimeChange("binder_cards", user.id, ids);
      try {
        const { data, error } = await supabase.rpc("dispose_binder_copies", {
          p_copy_ids: ids,
          p_disposal_status: status,
        });
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, ids);
        throw error;
      }
    },
    onMutate: ({ ids, status }) => {
      const disposedAt = new Date().toISOString();
      return patchLists(queryClient, [
        [
          queryKey,
          updateById<BinderCopy>(ids, (copy) => ({ ...copy, status, disposed_at: disposedAt })),
        ],
        [deckKey, releaseDeckEntriesOf(ids)],
      ]);
    },
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (updated) => replaceCopies(updated),
    onSettled: (_data, error) => refetchAfterDeferred(error),
  });

  const moveCopies = useMutation<
    BinderCopy[],
    Error,
    { ids: string[]; binderId: string | null },
    ListSnapshot[]
  >({
    mutationFn: async ({ ids, binderId }) => {
      if (!user) throw new Error("Sign in to move binder copies.");
      if (ids.length === 0) return [];
      markLocalRealtimeChange("binder_cards", user.id, ids);
      try {
        const { data, error } = await supabase
          .from("binder_cards")
          .update({ binder_id: binderId })
          .eq("user_id", user.id)
          .in("id", ids)
          .select("*");
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, ids);
        throw error;
      }
    },
    onMutate: ({ ids, binderId }) =>
      patchLists(queryClient, [
        [queryKey, updateById<BinderCopy>(ids, (copy) => ({ ...copy, binder_id: binderId }))],
      ]),
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (updated) => replaceCopies(updated),
  });

  const moveCopyToLocation = useMutation<
    BinderCopy,
    Error,
    MoveBinderCopyLocation,
    ListSnapshot[]
  >({
    mutationFn: async ({ id, binderId, deckId, changes }) => {
      if (!user) throw new Error("Sign in to move a binder copy.");
      markLocalRealtimeChange("binder_cards", user.id, [id]);
      try {
        const { data, error } = await supabase.rpc(
          "move_binder_copy_to_location",
          {
            p_copy_id: id,
            p_binder_id: binderId,
            p_deck_id: deckId,
            p_copy_changes: changes,
          },
        );
        if (error) throw error;
        const [copyResult] = data ?? [];
        if (!copyResult) throw new Error("The updated binder copy was not returned.");
        return copyResult;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, [id]);
        throw error;
      }
    },
    // Mirrors move_binder_copy_to_location: into a deck, the copy has no
    // folder and its Binder entry moves to that deck (or a new one is made);
    // anywhere else, an existing Binder entry becomes a virtual card.
    onMutate: ({ id, binderId, deckId, changes }) => {
      if (!user) return [];
      const userId = user.id;
      const moveEntry = (current: DeckEntry[]): DeckEntry[] => {
        const existing = current.find(
          (entry) => entry.binder_card_id === id && entry.kind === "binder",
        );
        if (!deckId) return releaseDeckEntriesOf([id])(current);
        if (existing) {
          return updateById<DeckEntry>([existing.id], (entry) => ({ ...entry, deck_id: deckId }))(current);
        }
        const copy = queryClient
          .getQueryData<BinderCopy[]>(queryKey)
          ?.find((item) => item.id === id);
        if (!copy) return current;
        return [
          ...current,
          toOptimisticDeckEntry(
            { deck_id: deckId, kind: "binder", binder_card_id: id, scryfall_id: copy.scryfall_id },
            userId,
          ),
        ];
      };
      return patchLists(queryClient, [
        [deckKey, moveEntry],
        [
          queryKey,
          updateById<BinderCopy>([id], (copy) => ({
            ...applyChanges(copy, changes),
            binder_id: deckId ? null : binderId,
          })),
        ],
      ]);
    },
    onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    onSuccess: (updated) => replaceCopies([updated]),
    onSettled: () => refetchDeckEntries(),
  });

  // Puts the server's version of these rows in the cached list.
  function replaceCopies(rows: BinderCopy[]) {
    const byId = new Map(rows.map((row) => [row.id, row]));
    queryClient.setQueryData<BinderCopy[]>(queryKey, (current) => {
      if (!current) return rows;
      const missing = rows.filter((row) => !current.some((copy) => copy.id === row.id));
      return [...current.map((copy) => byId.get(copy.id) ?? copy), ...missing];
    });
  }

  // Background refetch (not awaited, see above).
  function refetchDeckEntries() {
    void queryClient.invalidateQueries({ queryKey: deckKey });
  }

  // After a deferred (undo window) request: nothing to do when it was undone,
  // otherwise refetch both lists in the background.
  function refetchAfterDeferred(error: Error | null) {
    if (isUndoneError(error)) return;
    void queryClient.invalidateQueries({ queryKey });
    refetchDeckEntries();
  }

  return {
    ...query,
    realtimeError,
    copies: query.data ?? [],
    copiesByScryfallId,
    addCopy,
    addCopyToDeck,
    updateCopy,
    removeOrDisposeCopy,
    deleteCopies,
    disposeCopies,
    moveCopies,
    moveCopyToLocation,
  };
}
