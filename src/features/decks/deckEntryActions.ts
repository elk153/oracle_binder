import type { Binder } from "../binder/useBinders.ts";
import type { NotifyApi } from "../notifications/NotificationContext.ts";
import type { UndoWindow } from "../undoWindow.ts";
import {
  disposalLabel,
  runUndoable,
  type DisposalStatus,
} from "../selection/selectionActions.ts";
import type { DeckActions, DeckCard } from "./useDeckManagement.ts";

/**
 * The D-079 take-out actions for one deck entry, used by the deck popover.
 * They are the bulk actions of the Decks selection bar with one id, and
 * show the same 8-second Undo in the page notice.
 */
export type DeckEntryActions = {
  /** Folders an owned copy can go back to (besides Loose). */
  binders: Binder[];
  /** Removes the entry; an owned copy goes to `binderId` (null = Loose). */
  remove: (entry: DeckCard, cardName: string, binderId: string | null) => void;
  /** Disposes the entry's owned copy; the entry stays as a virtual card. */
  dispose: (entry: DeckCard, cardName: string, status: DisposalStatus) => void;
  /** Deletes the entry and, for an owned entry, its copy. */
  delete: (entry: DeckCard, cardName: string) => void;
};

type Options = {
  decks: DeckActions;
  binders: Binder[];
  disposeCopies: (input: {
    ids: string[];
    status: DisposalStatus;
    undoWindow?: UndoWindow;
  }) => Promise<unknown>;
  notify: Pick<NotifyApi, "undoable" | "error">;
};

export function createDeckEntryActions({
  decks,
  binders,
  disposeCopies,
  notify,
}: Options): DeckEntryActions {
  const deckName = (entry: DeckCard) =>
    decks.decks.find((deck) => deck.id === entry.deck_id)?.name ?? "the deck";

  return {
    binders,
    remove(entry, cardName, binderId) {
      const owned = entry.kind === "binder" && entry.binder_card_id;
      const destination = binderId
        ? (binders.find((binder) => binder.id === binderId)?.name ?? "the binder")
        : "Loose";
      void runUndoable(
        notify,
        `Removed ${cardName} from ${deckName(entry)}` +
          (owned ? `; the copy went to ${destination}.` : "."),
        "Could not remove the card",
        (undoWindow) => decks.removeDeckEntries({ ids: [entry.id], binderId, undoWindow }),
      );
    },
    dispose(entry, cardName, status) {
      if (entry.kind !== "binder" || !entry.binder_card_id) return;
      const copyId = entry.binder_card_id;
      void runUndoable(
        notify,
        `Disposed ${cardName} as ${disposalLabel(status).toLowerCase()}; it stays in ${deckName(entry)} as virtual.`,
        "Could not dispose the copy",
        (undoWindow) => disposeCopies({ ids: [copyId], status, undoWindow }),
      );
    },
    delete(entry, cardName) {
      const owned = entry.kind === "binder" && entry.binder_card_id;
      void runUndoable(
        notify,
        `Deleted ${cardName} from ${deckName(entry)}` +
          (owned ? ", including the owned copy." : "."),
        "Could not delete the card",
        (undoWindow) => decks.deleteDeckEntries({ ids: [entry.id], undoWindow }),
      );
    },
  };
}
