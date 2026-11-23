import type { ReactNode } from "react";
import "./Selection.css";

type SelectionBarProps = {
  /** How many items are selected. */
  count: number;
  /** What is selected, read out with the count, e.g. "3 cards (5 copies)". */
  summary: string;
  /** How many items are shown, for the "Select all shown" button. */
  shownCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  /** The page's own actions; shown only while something is selected. */
  children: ReactNode;
};

/**
 * Shared bar above a card grid for bulk actions (D-079). Without a selection
 * it only offers "Select all shown"; with one it shows the summary, Clear and
 * the page's actions. Binder and Decks pass their own actions as children.
 */
export default function SelectionBar({
  count,
  summary,
  shownCount,
  onSelectAll,
  onClear,
  children,
}: SelectionBarProps) {
  if (shownCount === 0) return null;
  return (
    <div className="page__toolbar selection-bar" role="toolbar" aria-label="Selection">
      {count > 0 && (
        <span className="selection-bar__summary" aria-live="polite">
          {summary} selected
        </span>
      )}
      <button
        type="button"
        className="page__control page__button"
        onClick={onSelectAll}
        disabled={count === shownCount}
      >
        Select all shown
      </button>
      {count > 0 && (
        <>
          <button type="button" className="page__control page__button" onClick={onClear}>
            Clear
          </button>
          {children}
        </>
      )}
    </div>
  );
}
