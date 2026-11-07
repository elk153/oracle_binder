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

export default function useDeckManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const decksKey = useMemo(() => decksQueryKey(user?.id), [user?.id]);
  const deckCardsKey = useMemo(() => deckCardsQueryKey(user?.id), [user?.id]);

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

  const renameDeck = useMutation<
    Deck,
    Error,
    { id: string; name: string }
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
    onSuccess: (updated) =>
      queryClient.setQueryData<Deck[]>(decksKey, (current) =>
        current?.map((deck) => (deck.id === updated.id ? updated : deck)),
      ),
  });

  const deleteDeck = useMutation<Deck, Error, string>({
    mutationFn: async (id) => {
      if (!user) throw new Error("Sign in to delete a deck.");
      const affectedCopyIds = (
        queryClient.getQueryData<DeckCard[]>(deckCardsKey) ?? []
      )
        .filter((entry) => entry.deck_id === id)
        .flatMap((entry) =>
          entry.binder_card_id ? [entry.binder_card_id] : [],
        );
      markLocalRealtimeChange("binder_cards", user.id, affectedCopyIds);
      try {
        const { data, error } = await supabase
          .from("decks")
          .delete()
          .eq("user_id", user.id)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, affectedCopyIds);
        throw error;
      }
    },
    onSuccess: async (deleted) => {
      queryClient.setQueryData<Deck[]>(decksKey, (current) =>
        current?.filter((deck) => deck.id !== deleted.id),
      );
      queryClient.setQueryData<DeckCard[]>(deckCardsKey, (current) =>
        current?.filter((entry) => entry.deck_id !== deleted.id),
      );
      await queryClient.invalidateQueries({
        queryKey: binderCopiesQueryKey(user?.id),
      });
    },
  });

  const addDeckCard = useMutation<DeckCard, Error, NewDeckCard>({
    mutationFn: async (entry) => {
      if (!user) throw new Error("Sign in to add a card to a deck.");
      const copyIds =
        entry.kind === "binder" && entry.binder_card_id
          ? [entry.binder_card_id]
          : [];
      markLocalRealtimeChange("binder_cards", user.id, copyIds);
      try {
        const { data, error } = await supabase
          .from("deck_cards")
          .insert({ ...entry, user_id: user.id })
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, copyIds);
        throw error;
      }
    },
    onSuccess: async (entry) => {
      queryClient.setQueryData<DeckCard[]>(deckCardsKey, (current) =>
        current ? [...current, entry] : [entry],
      );
      if (entry.binder_card_id) {
        await queryClient.invalidateQueries({
          queryKey: binderCopiesQueryKey(user?.id),
        });
      }
    },
  });

  const updateDeckCard = useMutation<
    DeckCard,
    Error,
    { id: string; changes: DeckCardChanges }
  >({
    mutationFn: async ({ id, changes }) => {
      if (!user) throw new Error("Sign in to update a deck card.");
      const currentEntry = (
        queryClient.getQueryData<DeckCard[]>(deckCardsKey) ?? []
      ).find((entry) => entry.id === id);
      const copyIds = [
        currentEntry?.binder_card_id,
        changes.kind === "binder" ? changes.binder_card_id : null,
      ].filter((copyId): copyId is string => Boolean(copyId));
      markLocalRealtimeChange("binder_cards", user.id, copyIds);
      try {
        const { data, error } = await supabase
          .from("deck_cards")
          .update(changes)
          .eq("user_id", user.id)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        clearLocalRealtimeChange("binder_cards", user.id, copyIds);
        throw error;
      }
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<DeckCard[]>(deckCardsKey, (current) =>
        current?.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      await queryClient.invalidateQueries({
        queryKey: binderCopiesQueryKey(user?.id),
      });
    },
  });

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
      updateDeckCard.isPending,
    createDeck: createDeck.mutateAsync,
    renameDeck: renameDeck.mutateAsync,
    deleteDeck: deleteDeck.mutateAsync,
    addDeckCard: addDeckCard.mutateAsync,
    updateDeckCard: updateDeckCard.mutateAsync,
  };
}

export type DeckActions = ReturnType<typeof useDeckManagement>;
