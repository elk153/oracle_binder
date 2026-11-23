import type { ReactNode } from "react";
import type { UndoNoticeState } from "./useUndoNotice.ts";

type UndoNoticeProps = {
  notice: UndoNoticeState | null;
  onUndo: () => void;
  onDismiss: () => void;
  /** Extra actions shown before Dismiss, e.g. a Sign in link. */
  children?: ReactNode;
};

/** The page notice from `useUndoNotice`, with Undo while it is possible. */
export default function UndoNotice({ notice, onUndo, onDismiss, children }: UndoNoticeProps) {
  if (!notice) return null;
  return (
    <div className="page__notice" role="status">
      <span>{notice.text}</span>
      {notice.canUndo && (
        <button type="button" className="page__notice-action" onClick={onUndo}>
          Undo
        </button>
      )}
      {children}
      <button type="button" className="page__notice-action" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
