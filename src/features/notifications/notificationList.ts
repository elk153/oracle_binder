import type { UndoWindow } from "../undoWindow.ts";

// The app-wide notification stack (D-080), as plain functions on a list so
// the rules can be tested without React. The provider keeps the list in
// state and does the side effects (sending an undo window) itself.

export const INFO_MS = 5_000;
export const MAX_VISIBLE = 5;

export type NotificationKind = "info" | "undo" | "error";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  text: string;
  /** Only on kind "undo": the action's 8-second window (D-079). */
  undoWindow?: UndoWindow;
  /** Optional link shown as an action, e.g. "Sign in". */
  link?: NotificationLink;
};

export type NotificationLink = { label: string; to: string };

/**
 * Adds a notification at the end (the bottom of the stack: newest last).
 * Above MAX_VISIBLE, the oldest non-error is removed; errors are pushed out
 * only when every visible notification is an error. The removed ones are
 * returned, so the caller can send an undo notice's action.
 */
export function addNotification(
  list: readonly AppNotification[],
  notification: AppNotification,
): { list: AppNotification[]; removed: AppNotification[] } {
  const next = [...list, notification];
  const removed: AppNotification[] = [];
  while (next.length > MAX_VISIBLE) {
    const index = next.findIndex((item) => item.kind !== "error");
    const [out] = next.splice(index === -1 ? 0 : index, 1);
    removed.push(out);
  }
  return { list: next, removed };
}

export function removeNotification(
  list: readonly AppNotification[],
  id: string,
): AppNotification[] {
  return list.filter((item) => item.id !== id);
}

/**
 * After Undo: the same notification now reads "Undone." and counts as a
 * 5-second info notice (D-080 point 6). It keeps its place in the stack.
 */
export function markUndone(
  list: readonly AppNotification[],
  id: string,
): AppNotification[] {
  return list.map((item) =>
    item.id === id ? { id: item.id, kind: "info", text: "Undone." } : item,
  );
}
