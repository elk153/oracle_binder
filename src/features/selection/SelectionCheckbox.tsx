import "./Selection.css";

type SelectionCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  /** Short visible text, e.g. "Select copies". */
  label: string;
  /** Full text for screen readers, e.g. "Select all owned copies of Opt". */
  ariaLabel: string;
};

/** The checkbox above a card tile that adds it to the selection (D-079). */
export default function SelectionCheckbox({
  checked,
  onChange,
  label,
  ariaLabel,
}: SelectionCheckboxProps) {
  return (
    <label className="selection-checkbox">
      <input
        type="checkbox"
        className="selection-checkbox__input"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      {label}
    </label>
  );
}
