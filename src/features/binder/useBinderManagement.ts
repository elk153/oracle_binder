import { useState } from "react";
import type { CardBrowserCard } from "../card-browser/types.ts";
import type { CopyFormValues } from "./BinderCopyForm.tsx";
import useBinderCopies, { type BinderCopy } from "./useBinderCopies.ts";
import useBinders from "./useBinders.ts";

type Notify = (message: string) => void;

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
    try {
      const { deck_id: deckId, ...copyValues } = values;
      const copy = {
        ...copyValues,
        binder_id: deckId ? null : copyValues.binder_id ?? null,
        status: values.status ?? "owned",
        scryfall_id: cardToAdd.id,
        rarity: cardToAdd.rarity,
      };
      if (deckId) {
        await copies.addCopyToDeck.mutateAsync({ copy, deckId });
        notify(`Added ${cardToAdd.name} to the selected deck.`);
      } else {
        await copies.addCopy.mutateAsync(copy);
        notify(`Added ${cardToAdd.name} to your Binder.`);
      }
      setCardToAdd(null);
    } catch (error) {
      notify(
        `Could not add ${cardToAdd.name}: ${
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

  async function disposeCopy(
    copyId: string,
    status: "sold" | "lost" | "given_away",
  ) {
    if (
      !confirmDeckConversion(
        `Mark this copy as ${status.replaceAll("_", " ")}?`,
      )
    ) {
      return;
    }
    try {
      await copies.removeOrDisposeCopy.mutateAsync({
        id: copyId,
        status,
      });
      notify(`Copy marked ${status.replaceAll("_", " ")}.`);
    } catch (error) {
      notify(
        `Could not update binder copy: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
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

  async function deleteCopy(copyId: string) {
    if (
      !confirmDeckConversion(
        "Delete this binder copy permanently?",
      )
    ) {
      return;
    }
    try {
      await copies.removeOrDisposeCopy.mutateAsync({
        id: copyId,
        status: null,
      });
      notify("Binder copy deleted.");
    } catch (error) {
      notify(
        `Could not delete binder copy: ${
          error instanceof Error ? error.message : "The request failed."
        }`,
      );
    }
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
