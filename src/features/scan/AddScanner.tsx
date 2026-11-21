import { useEffect, useState } from "react";
import useBinders from "../binder/useBinders.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import AddSessionSetup from "./AddSessionSetup.tsx";
import ScanCamera from "./ScanCamera.tsx";
import AddConfirm from "./AddConfirm.tsx";
import type { AddConfirmation } from "./AddConfirm.tsx";
import type { CardBrowserCard } from "../card-browser/types.ts";
import { describeTarget, describeType } from "./addSession.ts";
import type { AddSession } from "./addSession.ts";
import "./AddScanner.css";

// How long a notice stays on screen.
const NOTICE_MS = 8000;

// The scanner's Add mode for a signed-in user (D-064): the session setup
// first, then the camera with a summary of the session above it. Each found
// card opens the confirm step over the camera. Saving follows in step C.
export default function AddScanner() {
  const binders = useBinders();
  const decks = useDeckManagement();
  const [session, setSession] = useState<AddSession | null>(null);
  // Starts in setup; "Change" returns to it with the current session filled in.
  const [isEditing, setIsEditing] = useState(true);
  // The recognized card waiting for Confirm or Skip.
  const [pendingCard, setPendingCard] = useState<CardBrowserCard | null>(null);
  const [notice, setNotice] = useState("");

  // Hides the notice after a while; a new notice restarts the timer.
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(""), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // A card found while another one is being confirmed is ignored.
  function offerCard(card: CardBrowserCard) {
    setPendingCard((current) => current ?? card);
  }

  function confirm({ card, finish, quantity }: AddConfirmation) {
    setPendingCard(null);
    // Step B: nothing is saved yet; the notice shows what step C will add.
    setNotice(
      `Not saved yet: ${quantity} × ${card.name}${finish ? ` (${finish})` : ""}.`,
    );
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
          pendingCard && (
            <AddConfirm
              // A new card starts with fresh choices (finish, quantity).
              key={pendingCard.id}
              card={pendingCard}
              showFinish={session.type === "owned"}
              onConfirm={confirm}
              onSkip={() => setPendingCard(null)}
            />
          )
        }
      />
      {notice && (
        <p className="page__notice" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
