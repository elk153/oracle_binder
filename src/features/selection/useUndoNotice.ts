import { useCallback, useRef, useState } from "react";
import type { UndoWindow } from "../undoWindow.ts";

export type UndoNoticeState = {
  text: string;
  /** True while the action can still be undone. */
  canUndo: boolean;
};

/**
 * The page notice, with an Undo button while an action's undo window is
 * open (D-079). `show(text)` works like a plain notice; `show(text, window)`
 * adds Undo until the window ends. A newer notice sends the older action at
 * once, so only one Undo is ever on screen.
 *
 * The open window lives in a ref, not in state: sending or undoing it is a
 * side effect, and React state updaters must stay pure.
 */
export default function useUndoNotice() {
  const [notice, setNotice] = useState<UndoNoticeState | null>(null);
  const openWindow = useRef<UndoWindow | null>(null);

  const show = useCallback((text: string, undoWindow?: UndoWindow) => {
    if (openWindow.current && openWindow.current !== undoWindow) {
      openWindow.current.sendNow();
    }
    openWindow.current = undoWindow ?? null;
    setNotice({ text, canUndo: Boolean(undoWindow) });
    if (!undoWindow) return;
    // When the window ends (sent or undone), the Undo button goes away.
    const dropUndo = () => {
      if (openWindow.current !== undoWindow) return;
      openWindow.current = null;
      setNotice((current) => (current ? { ...current, canUndo: false } : current));
    };
    undoWindow.wait.then(dropUndo, dropUndo);
  }, []);

  const undo = useCallback(() => {
    openWindow.current?.undo();
    openWindow.current = null;
    setNotice({ text: "Undone.", canUndo: false });
  }, []);

  const dismiss = useCallback(() => {
    // Dismissing keeps the action: it is sent now instead of after 8 s.
    openWindow.current?.sendNow();
    openWindow.current = null;
    setNotice(null);
  }, []);

  return { notice, show, undo, dismiss };
}
