// Undo buffer for D-079 actions (delete, dispose, remove from deck).
//
// The screen changes at once (optimistic update), but the request to the
// database waits UNDO_WINDOW_MS. Undo during that time cancels the request:
// nothing reaches the database, and the mutation's onError puts the cached
// lists back. If the time runs out, or `sendNow` is called, the request is
// sent.
//
// Use:
//   const undoWindow = createUndoWindow();
//   deleteCopies.mutate({ ids, undoWindow });
//   showNotice({ onUndo: undoWindow.undo });
// and in the mutationFn: `await input.undoWindow?.wait;` before the request.

export const UNDO_WINDOW_MS = 8_000;

/** Thrown into the mutation when the user pressed Undo. Not a failure. */
export class UndoneError extends Error {
  constructor() {
    super("Undone.");
    this.name = "UndoneError";
  }
}

export function isUndoneError(error: unknown): error is UndoneError {
  return error instanceof UndoneError;
}

export type UndoWindow = {
  /** Resolves when the request may be sent; rejects with UndoneError on Undo. */
  wait: Promise<void>;
  /** Cancels the request. Does nothing once the request was sent. */
  undo: () => void;
  /** Sends the request now (for example when a newer action replaces it). */
  sendNow: () => void;
  /** True until the window has ended, one way or the other. */
  isOpen: () => boolean;
};

// Windows still waiting. They are sent at once only when the page is being
// closed or left (`pagehide`), so an action is not lost when the tab closes
// within the 8 seconds. A page that is merely hidden (tab switched, phone
// locked, notification shade) keeps its Undo: sending on `visibilitychange`
// removed Undo after a moment's switch, and sent a delete at once in a
// browser pane that hides itself in the background (D-079, 23 Nov 2026).
// If a hidden page is frozen and never comes back, the request is never
// sent and the change simply does not happen: the safe side for the data.
const openWindows = new Set<UndoWindow>();
let listening = false;

function sendAllNow() {
  for (const pending of [...openWindows]) pending.sendNow();
}

function listenForPageClose() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", sendAllNow);
}

export function createUndoWindow(ms: number = UNDO_WINDOW_MS): UndoWindow {
  let open = true;
  let resolveWait!: () => void;
  let rejectWait!: (error: Error) => void;

  const wait = new Promise<void>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });
  // Nobody may be waiting yet when Undo is pressed; this keeps the rejection
  // from being reported as unhandled. Awaiting `wait` still sees it.
  wait.catch(() => {});

  function close() {
    open = false;
    clearTimeout(timer);
    openWindows.delete(undoWindow);
  }

  const undoWindow: UndoWindow = {
    wait,
    undo() {
      if (!open) return;
      close();
      rejectWait(new UndoneError());
    },
    sendNow() {
      if (!open) return;
      close();
      resolveWait();
    },
    isOpen: () => open,
  };

  // `close` reads `timer`; it can only run after this line (undo and
  // sendNow are called later), so declaring it here is safe.
  const timer = setTimeout(() => undoWindow.sendNow(), ms);
  openWindows.add(undoWindow);
  listenForPageClose();
  return undoWindow;
}
