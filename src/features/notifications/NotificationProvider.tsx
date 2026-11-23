import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { UndoWindow } from "../undoWindow.ts";
import { NotificationContext, type NotifyApi } from "./NotificationContext.ts";
import NotificationStack from "./NotificationStack.tsx";
import {
  addNotification,
  markUndone,
  removeNotification,
  type AppNotification,
  type NotificationKind,
} from "./notificationList.ts";

/**
 * Holds the app-wide notification stack (D-080) and renders it once. Mount
 * it in the app layout so notifications stay while the user changes page.
 *
 * The list lives in state for rendering and in a ref for the handlers:
 * sending or undoing a window is a side effect, and React state updaters
 * must stay pure, so the handlers read the current list from the ref,
 * decide, do the side effect, and then store the new list.
 */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<AppNotification[]>([]);
  const listRef = useRef(list);

  const store = useCallback((next: AppNotification[]) => {
    listRef.current = next;
    setList(next);
  }, []);

  const remove = useCallback(
    (id: string) => store(removeNotification(listRef.current, id)),
    [store],
  );

  const add = useCallback(
    (kind: NotificationKind, text: string, undoWindow?: UndoWindow) => {
      const notification: AppNotification = { id: crypto.randomUUID(), kind, text, undoWindow };
      const { list: next, removed } = addNotification(listRef.current, notification);
      store(next);
      // Pushed out by the limit of 5: an undo notice's action goes now.
      for (const item of removed) item.undoWindow?.sendNow();
      if (undoWindow) {
        // When the window ends on its own (time ran out, page closed), the
        // notice goes. After Undo it is already an info notice: keep it.
        const end = () => {
          const current = listRef.current.find((item) => item.id === notification.id);
          if (current?.kind === "undo") remove(notification.id);
        };
        undoWindow.wait.then(end, end);
      }
    },
    [remove, store],
  );

  const undo = useCallback(
    (id: string) => {
      const item = listRef.current.find((entry) => entry.id === id);
      if (item?.kind !== "undo") return;
      // Mark first, so the window's end (Undo rejects `wait`) keeps it.
      store(markUndone(listRef.current, id));
      item.undoWindow?.undo();
    },
    [store],
  );

  const dismiss = useCallback(
    (id: string) => {
      const item = listRef.current.find((entry) => entry.id === id);
      remove(id);
      // Dismissing an undo notice keeps the action: it is sent now (D-079).
      if (item?.kind === "undo") item.undoWindow?.sendNow();
    },
    [remove],
  );

  const api = useMemo<NotifyApi>(
    () => ({
      info: (text) => add("info", text),
      undoable: (text, undoWindow) => add("undo", text, undoWindow),
      error: (text) => add("error", text),
      notify: (text, undoWindow) =>
        undoWindow ? add("undo", text, undoWindow) : add("info", text),
    }),
    [add],
  );

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <NotificationStack
        notifications={list}
        onUndo={undo}
        onDismiss={dismiss}
        onExpire={remove}
      />
    </NotificationContext.Provider>
  );
}
