import { useState } from "react";
import useBinders from "../binder/useBinders.ts";
import useDeckManagement from "../decks/useDeckManagement.ts";
import AddSessionSetup from "./AddSessionSetup.tsx";
import ScanCamera from "./ScanCamera.tsx";
import { describeTarget, describeType } from "./addSession.ts";
import type { AddSession } from "./addSession.ts";
import "./AddScanner.css";

// The scanner's Add mode for a signed-in user (D-064): the session setup
// first, then the camera with a summary of the session above it.
// The confirm step and saving follow in the next steps.
export default function AddScanner() {
  const binders = useBinders();
  const decks = useDeckManagement();
  const [session, setSession] = useState<AddSession | null>(null);
  // Starts in setup; "Change" returns to it with the current session filled in.
  const [isEditing, setIsEditing] = useState(true);

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
      <ScanCamera />
    </>
  );
}
