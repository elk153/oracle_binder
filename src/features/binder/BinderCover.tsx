import { coverColorOrDefault } from "./binderColors.ts";

type BinderCoverProps = {
  /** `#rrggbb`. An unusable value falls back to the default color. */
  color: string;
  /** Accessible name, e.g. "Open Trades, 3 copies". The logo is decorative. */
  label: string;
  onSelect: () => void;
};

/**
 * D-056: the cover of a binder (or of "Loose"). Same card shape as before,
 * filled with a color instead of a card print, with the app logo in the middle.
 * Styles live in `BinderPage.css` (`.binder-page__binder-cover`).
 */
export default function BinderCover({
  color,
  label,
  onSelect,
}: BinderCoverProps) {
  return (
    <button
      type="button"
      className="binder-page__binder-cover"
      style={{ backgroundColor: coverColorOrDefault(color) }}
      onClick={onSelect}
      aria-label={label}
    >
      <img
        className="binder-page__binder-logo"
        src={`${import.meta.env.BASE_URL}logo.svg`}
        alt=""
        draggable={false}
      />
    </button>
  );
}
