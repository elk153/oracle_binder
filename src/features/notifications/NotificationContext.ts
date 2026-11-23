import { createContext, useContext } from "react";
import type { UndoWindow } from "../undoWindow.ts";
import type { NotificationLink } from "./notificationList.ts";

// What pages use to show a notification in the app-wide stack (D-080).
export type NotifyApi = {
  /** A confirmation; goes away after 5 s. A link adds an action ("Sign in"). */
  info: (text: string, options?: { link?: NotificationLink }) => void;
  /** An action with Undo; stays for its 8-second window (D-079). */
  undoable: (text: string, undoWindow: UndoWindow) => void;
  /** A failure; stays until dismissed. */
  error: (text: string) => void;
  /**
   * Same signature as the pages' old notice setter: with a window it is an
   * undo notice, without one an info notice.
   */
  notify: (text: string, undoWindow?: UndoWindow) => void;
};

export const NotificationContext = createContext<NotifyApi | null>(null);

export function useNotify(): NotifyApi {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotify must be used within a NotificationProvider");
  }
  return context;
}
