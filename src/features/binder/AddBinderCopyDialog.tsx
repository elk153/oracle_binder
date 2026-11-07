import { useEffect, useRef } from "react";
import type { Tables } from "../../types/database.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import type { Deck } from "../decks/useDeckManagement.ts";
import BinderCopyForm, { type CopyFormValues } from "./BinderCopyForm.tsx";
import "./Binder.css";

type Binder = Tables<"binders">;

type AddBinderCopyDialogProps = {
  card: CardBrowserCard;
  binders: Binder[];
  decks: Deck[];
  onSave: (values: CopyFormValues) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
};

export default function AddBinderCopyDialog({
  card,
  binders,
  decks,
  onSave,
  onClose,
  isSaving,
}: AddBinderCopyDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  return (
    <div
      className="binder-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        className="binder-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="binder-copy-dialog-title"
      >
        <header className="binder-dialog__header">
          <h2 id="binder-copy-dialog-title">Add {card.name} to collection</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close add-copy dialog"
            onClick={onClose}
            disabled={isSaving}
          >
            ×
          </button>
        </header>
        <BinderCopyForm
          cardName={card.name}
          binders={binders}
          decks={decks}
          onSave={(values) => void onSave(values)}
          onCancel={onClose}
          isSaving={isSaving}
        />
      </section>
    </div>
  );
}
