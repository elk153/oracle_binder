import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import type { Tables, TablesInsert, TablesUpdate } from "../../types/database.ts";
import useRealtimeInvalidation from "../../hooks/useRealtimeInvalidation.ts";
import { clearLocalRealtimeChange, markLocalRealtimeChange } from "../../services/localRealtimeChanges.ts";

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

export const binderCopiesQueryKey = (userId?: string) =>
  ["binderCopies", userId] as const;

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

  const addCopy = useMutation<BinderCopy, Error, NewBinderCopy>({
    mutationFn: async (copy) => {
      if (!user) throw new Error("Sign in to add a binder copy.");
      const id = crypto.randomUUID();
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
    onSuccess: (copy) =>
      queryClient.setQueryData<BinderCopy[]>(queryKey, (current) =>
        current ? [...current, copy] : [copy],
      ),
  });

  const updateCopy = useMutation<
    BinderCopy,
    Error,
    { id: string; changes: BinderCopyUpdate }
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
    onSuccess: (updated) =>
      queryClient.setQueryData<BinderCopy[]>(queryKey, (current) =>
        current?.map((copy) => (copy.id === updated.id ? updated : copy)),
      ),
  });

  const removeOrDisposeCopy = useMutation<
    void,
    Error,
    RemoveOrDisposeBinderCopy
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
    onSuccess: (_result, { id, status, changes = {} }) =>
      queryClient.setQueryData<BinderCopy[]>(queryKey, (current) =>
        status === null
          ? current?.filter((copy) => copy.id !== id)
          : current?.map((copy) =>
              copy.id === id
                ? {
                    ...copy,
                    ...changes,
                    status,
                    disposed_at: new Date().toISOString(),
                  }
                : copy,
            ),
      ),
  });

  const moveCopies = useMutation<
    BinderCopy[],
    Error,
    { ids: string[]; binderId: string | null }
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
    onSuccess: (updated) => {
      const updatedById = new Map(updated.map((copy) => [copy.id, copy]));
      queryClient.setQueryData<BinderCopy[]>(queryKey, (current) =>
        current?.map((copy) => updatedById.get(copy.id) ?? copy),
      );
    },
  });

  return {
    ...query,
    realtimeError,
    copies: query.data ?? [],
    copiesByScryfallId,
    addCopy,
    updateCopy,
    removeOrDisposeCopy,
    moveCopies,
  };
}
