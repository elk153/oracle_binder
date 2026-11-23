import { useState } from "react";
import useBinders from "../binder/useBinders.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import AddSessionSetup from "./AddSessionSetup.tsx";
import ScanCamera from "./ScanCamera.tsx";
import type { FoundMatch } from "./ScanCamera.tsx";
import AddConfirm from "./AddConfirm.tsx";
import type { AddConfirmation } from "./AddConfirm.tsx";
import type { CardBrowserCard } from "../card-browser/types.ts";
import useScanAdd from "./useScanAdd.ts";
import type { AddedBatch } from "./useScanAdd.ts";
import { describeTarget, describeType } from "./addSession.ts";
import type { AddSession } from "./addSession.ts";
import { useNotify } from "../notifications/NotificationContext.ts";
import { createUndoWindow, isUndoneError } from "../undoWindow.ts";
import "./AddScanner.css";

// What Undo removes after a successful add.
type AddedCards = { batch: AddedBatch; count: number; name: string };

// The scanner's Add mode for a signed-in user (D-064): the session setup
// first, then the camera with a summary of the session above it. Each found
// card opens the confirm step over the camera; Add saves in the background,
// so scanning resumes at once, and the notification stack offers Undo
// (D-080).
export default function AddScanner() {
  const binders = useBinders();
  const decks = useDeckManagement();
  const [session, setSession] = useState<AddSession | null>(null);
  // Starts in setup; "Change" returns to it with the current session filled in.
  const [isEditing, setIsEditing] = useState(true);
  // The recognized card waiting for Confirm or Skip.
  // The card being confirmed, and whether it was found by its name only.
  const [pending, setPending] = useState<{ card: CardBrowserCard; match: FoundMatch } | null>(null);
  const notify = useNotify();
  const { addCards, undo } = useScanAdd();

  // A card found while another one is being confirmed is ignored.
  function offerCard(card: CardBrowserCard, match: FoundMatch) {
    setPending((current) => current ?? { card, match });
  }

  async function confirm(confirmation: AddConfirmation) {
    if (!session) {
      return;
    }
    // Close the confirm step first, so the scanner is ready for the next card
    // while this one is saved.
    setPending(null);
    const { name } = confirmation.card;
    notify.info(`Adding ${confirmation.quantity} × ${name}…`);

    const { batch, added, requested, error } = await addCards(session, confirmation);
    if (added === 0) {
      notify.error(`Could not add ${name}: ${error?.message ?? "the request failed."}`);
      return;
    }
    offerUndo(
      error ? `Added ${added} of ${requested} × ${name}.` : `Added ${added} × ${name}.`,
      { batch, count: added, name },
    );
    if (error) notify.error(`Could not add the other ${requested - added} × ${name}: ${error.message}`);
  }

  // The cards are already saved, so here the undo window does not delay a
  // request: Undo within its 8 s (paused while hovered) removes the batch,
  // and when the window ends or is dismissed there is nothing left to do.
  function offerUndo(text: string, added: AddedCards) {
    const undoWindow = createUndoWindow();
    notify.undoable(text, undoWindow);
    undoWindow.wait.catch((reason: unknown) => {
      if (isUndoneError(reason)) void undoAdd(added);
    });
  }

  async function undoAdd({ batch, count, name }: AddedCards) {
    const { error } = await undo(batch);
    if (error) notify.error(`Undo failed: ${error.message}`);
    else notify.info(`Removed ${count} × ${name}.`);
  }

  if (binders.isLoading || decks.isLoading) {
    return (
      <p className="page__message" aria-live="polite" aria-busy="true">
        Loading your binders and decks…
      </p>
    );
  }

  const loadError = binders.error ?? decks.error;
  if (loadError) {
    return (
      <p className="page__message page__message--error" role="alert">
        Could not load your binders and decks: {loadError.message}
      </p>
    );
  }

  if (isEditing || !session) {
    return (
      <AddSessionSetup
        binders={binders.binders}
        decks={decks.decks}
        initial={session}
        onStart={(started) => {
          setSession(started);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="scan-add__session">
        <p className="scan-add__summary">
          Adding to <strong className="scan-add__target">{describeTarget(session.target)}</strong> · {describeType(session.type)}
        </p>
        <button
          type="button"
          className="page__control page__button"
          onClick={() => setIsEditing(true)}
          aria-label="Change the Add session"
        >
          Change
        </button>
      </div>
      <ScanCamera
        onFound={offerCard}
        overlay={
          pending && (
            <AddConfirm
              // A new card starts with fresh choices (finish, quantity).
              key={pending.card.id}
              card={pending.card}
              // Found by name: Scryfall's default printing, so the printing
              // list opens at once for the user to pick theirs (D-065).
              choosePrinting={pending.match.byName}
              // Foil mark and language read on the card (D-066).
              read={pending.match}
              defaultLanguage={session.defaults.language}
              showFinish={session.type === "owned"}
              onConfirm={(confirmation) => void confirm(confirmation)}
              onSkip={() => setPending(null)}
            />
          )
        }
      />
    </>
  );
}
