import { useState } from "react";
import type { Tables } from "../../types/database.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import BinderCopyForm, { type CopyFormValues } from "./BinderCopyForm.tsx";
import type { BinderCopy } from "./useBinderCopies.ts";
import type { Deck, DeckCard } from "../decks/useDeckManagement.ts";
import "./Binder.css";

type Binder = Tables<"binders">;

type BinderCopiesPopoverProps = {
  card: CardBrowserCard;
  copies: BinderCopy[];
  binders: Binder[];
  deckCards: DeckCard[];
  decks: Deck[];
  isBusy: boolean;
  onAdd: () => void;
  onUpdate: (copy: BinderCopy, values: CopyFormValues) => Promise<boolean>;
  onDispose: (copy: BinderCopy, status: "sold" | "lost" | "given_away") => void;
  onRestore: (copy: BinderCopy) => void;
  onDelete: (copy: BinderCopy) => void;
  onClose: () => void;
};

function describeCopy(copy: BinderCopy, binders: Binder[]): string[] {
  const details = [
    copy.binder_id
      ? binders.find((binder) => binder.id === copy.binder_id)?.name ?? "Unknown binder"
      : "Loose",
    copy.condition,
    copy.finish,
    copy.language,
    copy.purchase_price === null ? null : `Paid ${copy.purchase_price}`,
    copy.location,
    copy.notes,
  ];
  return details.filter((value): value is string => Boolean(value));
}

export default function BinderCopiesPopover({
  card,
  copies,
  binders,
  deckCards,
  decks,
  isBusy,
  onAdd,
  onUpdate,
  onDispose,
  onRestore,
  onDelete,
  onClose,
}: BinderCopiesPopoverProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [editingCopyId, setEditingCopyId] = useState<string | null>(null);
  const ownedCopies = copies.filter((copy) => copy.status === "owned");
  const disposedCopies = copies.filter((copy) => copy.status !== "owned");
  const visibleCopies = showHistory ? copies : ownedCopies;

  return (
    <section
      className="binder-copy-popover"
      aria-label={`${card.name} binder copies`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="binder-copy-popover__header">
        <strong>{card.name}</strong>
        <span>{ownedCopies.length} owned</span>
        <button type="button" aria-label="Close binder copies" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="binder-copy-popover__actions">
        <button type="button" onClick={onAdd} disabled={isBusy}>
          Add another copy
        </button>
        <button
          type="button"
          onClick={() => setShowHistory((visible) => !visible)}
          aria-expanded={showHistory}
        >
          {showHistory ? "Hide history" : `History (${disposedCopies.length})`}
        </button>
      </div>
      {visibleCopies.length === 0 ? (
        <p className="binder-copy-popover__empty">
          {showHistory ? "No copies in history." : "No owned copies."}
        </p>
      ) : (
        <ul className="binder-copy-popover__list">
          {visibleCopies.map((copy, index) => {
            const deckEntry = deckCards.find(
              (entry) => entry.binder_card_id === copy.id,
            );
            const deckName = deckEntry
              ? decks.find((deck) => deck.id === deckEntry.deck_id)?.name
              : undefined;
            return (
              <li key={copy.id} className="binder-copy-popover__copy">
                <div className="binder-copy-popover__copy-heading">
                  <strong>Copy {index + 1}</strong>
                  <span>{copy.status.replaceAll("_", " ")}</span>
                  {deckEntry && (
                    <span>In deck: {deckName ?? "Unknown deck"}</span>
                  )}
                </div>
                {editingCopyId === copy.id ? (
                  <BinderCopyForm
                    cardName={card.name}
                    binders={binders}
                    initialCopy={copy}
                    onSave={async (values) => {
                      if (await onUpdate(copy, values)) {
                        setEditingCopyId(null);
                      }
                    }}
                    onCancel={() => setEditingCopyId(null)}
                    isSaving={isBusy}
                  />
                ) : (
                  <>
                    <p>
                      {describeCopy(copy, binders).join(" · ") ||
                        "No additional details"}
                    </p>
                    <div className="binder-copy-popover__actions">
                      <button
                        type="button"
                        onClick={() => setEditingCopyId(copy.id)}
                        disabled={isBusy}
                      >
                        Edit
                      </button>
                      {copy.status === "owned" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onDispose(copy, "sold")}
                            disabled={isBusy}
                          >
                            Sold
                          </button>
                          <button
                            type="button"
                            onClick={() => onDispose(copy, "lost")}
                            disabled={isBusy}
                          >
                            Lost
                          </button>
                          <button
                            type="button"
                            onClick={() => onDispose(copy, "given_away")}
                            disabled={isBusy}
                          >
                            Given away
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestore(copy)}
                          disabled={isBusy}
                        >
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(copy)}
                        disabled={isBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
