import { useState } from "react";
import type { CardBrowserCard } from "../card-browser/types.ts";
import type { CopyFormValues } from "./BinderCopyForm.tsx";
import useBinderCopies, { type BinderCopy } from "./useBinderCopies.ts";
import useBinders from "./useBinders.ts";
import type { UndoWindow } from "../undoWindow.ts";
import {
  countText,
  disposalLabel,
  runUndoable,
} from "../selection/selectionActions.ts";

// The page notice. With an undo window it shows Undo (useUndoNotice, D-079).
export type Notify = (message: string, undoWindow?: UndoWindow) => void;

function isDisposalStatus(
  status: string,
): status is "sold" | "lost" | "given_away" {
  return status === "sold" || status === "lost" || status === "given_away";
}

function confirmDeckConversion(action: string): boolean {
  return window.confirm(
    `${action} If this copy is in a deck, its deck entry will remain as a virtual card.`,
  );
}

export default function useBinderManagement(notify: Notify) {
  const [cardToAdd, setCardToAdd] = useState<CardBrowserCard | null>(null);
  const copies = useBinderCopies();
  const bindersQuery = useBinders();

  function requestAdd(card: CardBrowserCard) {
    setCardToAdd(card);
  }

  async function addCopy(values: CopyFormValues) {
    if (!cardToAdd) return;
    const card = cardToAdd;
    // Optimistic (D-071): the new copy gets its id here, shows up at once,
    // and the dialog closes without waiting for the server. A failure takes
    // the copy away again and explains why in the notice.
    setCardToAdd(null);
    try {
      const { deck_id: deckId, ...copyValues } = values;
      const copy = {
        ...copyValues,
        id: crypto.randomUUID(),
        binder_id: deckId ? null : copyValues.binder_id ?? null,
        status: values.status ?? "owned",
        scryfall_id: card.id,
        rarity: card.rarity,
      };
      if (deckId) {
        await copies.addCopyToDeck.mutateAsync({ copy, deckId });
        notify(`Added ${card.name} to the selected deck.`);
      } else {
        await copies.addCopy.mutateAsync(copy);
        notify(`Added ${card.name} to your Binder.`);
      }
    } catch (error) {
      notify(
        `Could not add ${card.name}: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  async function updateCopy(copy: BinderCopy, values: CopyFormValues) {
    try {
      const { deck_id: deckId, ...copyValues } = values;
      const nextStatus = values.status ?? copy.status;
      if (copy.status === "owned" && nextStatus !== "owned") {
        if (!isDisposalStatus(nextStatus)) {
          throw new Error("Choose a valid disposal status.");
        }
        if (!confirmDeckConversion(`Mark this copy as ${nextStatus.replaceAll("_", " ")}?`)) {
          return false;
        }
        const disposalChanges = { ...copyValues };
        delete disposalChanges.status;
        await copies.removeOrDisposeCopy.mutateAsync({
          id: copy.id,
          status: nextStatus,
          changes: disposalChanges,
        });
        notify("Binder copy updated.");
        return true;
      }

      const changes = {
        ...copyValues,
        disposal_price:
          nextStatus === "owned"
            ? null
            : copy.disposal_price,
        disposed_at:
          nextStatus === "owned"
            ? null
            : copy.disposed_at ?? new Date().toISOString(),
      };
      if ("binder_id" in values) {
        const { binder_id: binderId, ...locationChanges } = changes;
        await copies.moveCopyToLocation.mutateAsync({
          id: copy.id,
          binderId: binderId ?? null,
          deckId: deckId ?? null,
          changes: locationChanges,
        });
      } else {
        await copies.updateCopy.mutateAsync({ id: copy.id, changes });
      }
      notify("Binder copy updated.");
      return true;
    } catch (error) {
      notify(
        `Could not update binder copy: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
      return false;
    }
  }

  // D-079: one copy from the Binder popover goes through the same bulk
  // functions as the selection bar, with the 8-second Undo instead of a
  // confirm dialog. A deck entry using the copy turns virtual (D-034).
  function disposeCopy(copyId: string, status: "sold" | "lost" | "given_away") {
    void runUndoable(
      notify,
      `Disposed ${countText(1, "copy", "copies")} as ${disposalLabel(status).toLowerCase()}.`,
      "Could not dispose the copy",
      (undoWindow) => copies.disposeCopies.mutateAsync({ ids: [copyId], status, undoWindow }),
    );
  }

  async function restoreCopy(copyId: string) {
    try {
      await copies.updateCopy.mutateAsync({
        id: copyId,
        changes: {
          status: "owned",
          disposed_at: null,
          disposal_price: null,
        },
      });
      notify("Copy restored to owned.");
    } catch (error) {
      notify(
        `Could not restore binder copy: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
  }

  function deleteCopy(copyId: string) {
    void runUndoable(
      notify,
      "Deleted 1 copy.",
      "Could not delete the copy",
      (undoWindow) => copies.deleteCopies.mutateAsync({ ids: [copyId], undoWindow }),
    );
  }

  const isPending =
    copies.addCopy.isPending ||
    copies.addCopyToDeck.isPending ||
    copies.updateCopy.isPending ||
    copies.removeOrDisposeCopy.isPending ||
    copies.moveCopyToLocation.isPending;

  return {
    copies,
    binders: bindersQuery.binders,
    bindersQuery,
    bindersError: bindersQuery.error,
    realtimeError:
      copies.realtimeError ?? bindersQuery.realtimeError ?? null,
    bindersLoading: bindersQuery.isLoading,
    cardToAdd,
    requestAdd,
    closeAdd: () => setCardToAdd(null),
    addCopy,
    updateCopy,
    disposeCopy,
    restoreCopy,
    deleteCopy,
    isPending,
  };
}
