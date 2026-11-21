import useBinderCopies from "../binder/useBinderCopies.ts";
import type { NewBinderCopy } from "../binder/useBinderCopies.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import type { AddSession } from "./addSession.ts";
import type { AddConfirmation } from "./AddConfirm.tsx";

// Saving for the scanner's Add mode (D-064): creates what one Confirm asks
// for, and undoes exactly that. Reuses the binder and deck mutations, so their
// cache updates keep the Binder and Decks pages current.

// What one Confirm created, so Undo can remove exactly that.
export type AddedBatch =
  | { kind: "copies"; copyIds: string[]; inDeck: boolean }
  | { kind: "proxies"; entryIds: string[] };

export type AddOutcome = {
  batch: AddedBatch;
  added: number;
  requested: number;
  error: Error | null; // set when it stopped before `requested`
};

export type UndoOutcome = {
  error: Error | null;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("The request failed.");
}

export default function useScanAdd() {
  const copies = useBinderCopies();
  const decks = useDeckManagement();

  // Several copies need several inserts. They run one after another in a
  // short loop (no new database function); the first failure stops the loop
  // and the outcome says how many were added, so nothing fails silently.
  async function addCards(
    { target, type, defaults }: AddSession,
    { card, finish, quantity }: AddConfirmation,
  ): Promise<AddOutcome> {
    if (type === "proxy") {
      const entryIds: string[] = [];
      try {
        if (target.kind !== "deck") {
          throw new Error("Proxies can only be added to a deck.");
        }
        for (let i = 0; i < quantity; i += 1) {
          const entry = await decks.addDeckCard({
            deck_id: target.id,
            scryfall_id: card.id,
            kind: "proxy",
            binder_card_id: null,
          });
          entryIds.push(entry.id);
        }
        return { batch: { kind: "proxies", entryIds }, added: entryIds.length, requested: quantity, error: null };
      } catch (error) {
        return { batch: { kind: "proxies", entryIds }, added: entryIds.length, requested: quantity, error: toError(error) };
      }
    }

    const copy: NewBinderCopy = {
      ...defaults,
      scryfall_id: card.id,
      rarity: card.rarity,
      status: "owned",
      finish,
      binder_id: target.kind === "binder" ? target.id : null,
    };
    const inDeck = target.kind === "deck";
    const copyIds: string[] = [];
    try {
      for (let i = 0; i < quantity; i += 1) {
        const created =
          target.kind === "deck"
            ? await copies.addCopyToDeck.mutateAsync({ copy, deckId: target.id })
            : await copies.addCopy.mutateAsync(copy);
        copyIds.push(created.id);
      }
      return { batch: { kind: "copies", copyIds, inDeck }, added: copyIds.length, requested: quantity, error: null };
    } catch (error) {
      return { batch: { kind: "copies", copyIds, inDeck }, added: copyIds.length, requested: quantity, error: toError(error) };
    }
  }

  // Removes exactly what a batch created. For a copy placed in a deck, the
  // deck entry goes first: deleting the copy first would turn the entry into
  // a virtual one instead of removing it.
  async function undo(batch: AddedBatch): Promise<UndoOutcome> {
    try {
      if (batch.kind === "proxies") {
        await decks.deleteDeckCards({ by: "id", values: batch.entryIds });
        return { error: null };
      }
      if (batch.inDeck) {
        await decks.deleteDeckCards({ by: "binder_card_id", values: batch.copyIds });
      }
      for (const id of batch.copyIds) {
        await copies.removeOrDisposeCopy.mutateAsync({ id, status: null });
      }
      return { error: null };
    } catch (error) {
      return { error: toError(error) };
    }
  }

  return { addCards, undo };
}
