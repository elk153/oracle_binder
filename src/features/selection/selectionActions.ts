import { createUndoWindow, isUndoneError, type UndoWindow } from "../undoWindow.ts";

// Shared by the Binder and Decks selection bars (D-079).

export const DISPOSAL_STATUSES = [
  { value: "sold", label: "Sold" },
  { value: "lost", label: "Lost" },
  { value: "given_away", label: "Given away" },
] as const;
export type DisposalStatus = (typeof DISPOSAL_STATUSES)[number]["value"];

export function disposalLabel(status: DisposalStatus): string {
  return DISPOSAL_STATUSES.find((option) => option.value === status)?.label ?? status;
}

/** "1 copy", "3 copies"; `plural` defaults to the word plus "s". */
export function countText(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}

/**
 * Runs an action with an 8-second undo buffer: the notice shows `text` with
 * Undo, the action waits for the window before its request, and Undo cancels
 * it. An undone action is not an error; a real failure replaces the notice.
 */
export async function runUndoable(
  show: (text: string, undoWindow?: UndoWindow) => void,
  text: string,
  failure: string,
  run: (undoWindow: UndoWindow) => Promise<unknown>,
) {
  const undoWindow = createUndoWindow();
  show(text, undoWindow);
  try {
    await run(undoWindow);
  } catch (error) {
    if (isUndoneError(error)) return;
    show(`${failure}: ${errorText(error)}`);
  }
}
