import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import type { Tables } from "../../types/database.ts";
import { binderCopiesQueryKey } from "./useBinderCopies.ts";
import useRealtimeInvalidation from "../../hooks/useRealtimeInvalidation.ts";
import { clearLocalRealtimeChange, markLocalRealtimeChange } from "../../services/localRealtimeChanges.ts";

export type Binder = Tables<"binders">;

/** What the create and modify dialog collects (D-056). */
export type BinderValues = { name: string; color: string };

export const bindersQueryKey = (userId?: string) =>
  ["binders", userId] as const;

export default function useBinders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => bindersQueryKey(user?.id), [user?.id]);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to load binders.");
      const { data, error } = await supabase
        .from("binders")
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
  const realtimeError = useRealtimeInvalidation({
    table: "binders",
    userId: user?.id,
    queryKey,
  });

  const createBinder = useMutation<Binder, Error, BinderValues>({
    mutationFn: async ({ name, color }) => {
      if (!user) throw new Error("Sign in to create a binder.");
      const id = crypto.randomUUID();
      markLocalRealtimeChange("binders", user.id, [id]);
      try {
        const { data, error } = await supabase
          .from("binders")
          .insert({ id, user_id: user.id, name: name.trim(), color })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binders", user.id, [id]);
        throw error;
      }
    },
    onSuccess: (binder) =>
      queryClient.setQueryData<Binder[]>(queryKey, (current) =>
        current ? [...current, binder] : [binder],
      ),
  });

  const updateBinder = useMutation<Binder, Error, BinderValues & { id: string }>({
    mutationFn: async ({ id, name, color }) => {
      if (!user) throw new Error("Sign in to modify a binder.");
      markLocalRealtimeChange("binders", user.id, [id]);
      try {
        const { data, error } = await supabase
          .from("binders")
          .update({ name: name.trim(), color })
          .eq("user_id", user.id)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binders", user.id, [id]);
        throw error;
      }
    },
    onSuccess: (updated) =>
      queryClient.setQueryData<Binder[]>(queryKey, (current) =>
        current?.map((binder) => (binder.id === updated.id ? updated : binder)),
      ),
  });

  const deleteBinder = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!user) throw new Error("Sign in to delete a binder.");
      const affectedCopyIds = (
        queryClient.getQueryData<Tables<"binder_cards">[]>(
          binderCopiesQueryKey(user.id),
        ) ?? []
      )
        .filter((copy) => copy.binder_id === id)
        .map((copy) => copy.id);
      markLocalRealtimeChange("binders", user.id, [id]);
      markLocalRealtimeChange("binder_cards", user.id, affectedCopyIds);
      try {
        const { error } = await supabase
          .from("binders")
          .delete()
          .eq("user_id", user.id)
          .eq("id", id);
        if (error) throw error;
      } catch (error) {
        clearLocalRealtimeChange("binders", user.id, [id]);
        clearLocalRealtimeChange("binder_cards", user.id, affectedCopyIds);
        throw error;
      }
    },
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Binder[]>(queryKey, (current) =>
        current?.filter((binder) => binder.id !== id),
      );
      queryClient.setQueryData<Tables<"binder_cards">[]>(
        binderCopiesQueryKey(user?.id),
        (current) =>
          current?.map((copy) =>
            copy.binder_id === id ? { ...copy, binder_id: null } : copy,
          ),
      );
    },
  });

  return {
    ...query,
    realtimeError,
    binders: query.data ?? [],
    createBinder,
    updateBinder,
    deleteBinder,
  };
}
