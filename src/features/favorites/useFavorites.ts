import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AppProviders/AuthContext.ts";
import { supabase } from "../../services/supabaseClient.ts";
import useRealtimeInvalidation from "../../hooks/useRealtimeInvalidation.ts";
import { markLocalRealtimeChange, clearLocalRealtimeChange } from "../../services/localRealtimeChanges.ts";

const FAVORITES_PAGE_SIZE = 500;

type FavoriteRow = {
  scryfall_id: string;
};

type FavoriteMutationContext = {
  previousIds: string[] | undefined;
};

type ToggleFavoriteInput = {
  userId: string;
  scryfallId: string;
  isFavorite: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFavoriteRows(value: unknown): FavoriteRow[] {
  if (!Array.isArray(value)) {
    throw new Error("Supabase returned favorites in an unexpected format.");
  }

  return value.map((row) => {
    if (!isRecord(row) || typeof row.scryfall_id !== "string") {
      throw new Error("Supabase returned a favorite with an invalid card ID.");
    }

    return { scryfall_id: row.scryfall_id };
  });
}

async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const favoriteIds: string[] = [];
  let cursor: string | undefined;

  while (true) {
    let request = supabase
      .from("favorites")
      .select("scryfall_id")
      .eq("user_id", userId)
      .order("scryfall_id", { ascending: true })
      .limit(FAVORITES_PAGE_SIZE);

    if (cursor) {
      request = request.gt("scryfall_id", cursor);
    }

    const { data, error } = await request;
    if (error) throw error;

    const rows = parseFavoriteRows(data);
    favoriteIds.push(...rows.map((row) => row.scryfall_id));

    if (rows.length < FAVORITES_PAGE_SIZE) {
      return favoriteIds;
    }

    cursor = rows[rows.length - 1].scryfall_id;
  }
}

export function useFavoriteIds() {
  const { user } = useAuth();
  const queryKey = useMemo(() => ["favorites", user?.id] as const, [user?.id]);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!user) throw new Error("Sign in to load favorites.");
      return fetchFavoriteIds(user.id);
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const realtimeError = useRealtimeInvalidation({
    table: "favorites",
    userId: user?.id,
    queryKey,
  });

  const favoriteIds = useMemo(
    () => new Set(query.data ?? []),
    [query.data],
  );

  return {
    ids: query.data ?? [],
    favoriteIds,
    isLoading: query.isLoading,
    error: query.error,
    realtimeError,
  };
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleFavoriteInput, FavoriteMutationContext>({
    mutationFn: async ({ userId, scryfallId, isFavorite }) => {
      if (!user || user.id !== userId) {
        throw new Error("Sign in again before changing favorites.");
      }

      markLocalRealtimeChange("favorites", userId, [scryfallId]);
      try {
        const request = isFavorite
          ? supabase
              .from("favorites")
              .delete()
              .eq("user_id", userId)
              .eq("scryfall_id", scryfallId)
          : supabase.from("favorites").insert({
              user_id: userId,
              scryfall_id: scryfallId,
            });
        const { error } = await request;
        if (error) throw error;
      } catch (error) {
        clearLocalRealtimeChange("favorites", userId, [scryfallId]);
        throw error;
      }
    },
    // Optimistic update (D-071): show the new heart state right away instead
    // of after the server round trips. Steps:
    // 1. stop running favorites fetches so they cannot overwrite our change,
    // 2. remember the current list (the snapshot) for a rollback,
    // 3. write the expected list into the cache; every heart re-renders.
    onMutate: async ({ userId, scryfallId, isFavorite }) => {
      const queryKey = ["favorites", userId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousIds = queryClient.getQueryData<string[]>(queryKey);
      // No list loaded yet: nothing to update safely; wait for the server.
      if (previousIds === undefined) return { previousIds };
      queryClient.setQueryData<string[]>(queryKey, (ids = previousIds) =>
        isFavorite
          ? ids.filter((id) => id !== scryfallId)
          : ids.includes(scryfallId)
            ? ids
            : [...ids, scryfallId],
      );
      return { previousIds };
    },
    // The server refused: put the snapshot back, so the heart shows the truth.
    onError: (_error, { userId }, context) => {
      if (context?.previousIds !== undefined) {
        queryClient.setQueryData(["favorites", userId], context.previousIds);
      }
    },
    // Success or failure: fetch the real list in the background. Not returned,
    // so the mutation is no longer "pending" while this refetch runs.
    onSettled: (_data, _error, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
    },
  });
}
