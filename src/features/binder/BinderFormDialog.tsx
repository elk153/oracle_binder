import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  BINDER_COLORS,
  DEFAULT_BINDER_COLOR,
  coverColorOrDefault,
  type BinderColorOption,
} from "./binderColors.ts";
import type { BinderValues } from "./useBinders.ts";
import "./Binder.css";
import "./BinderFormDialog.css";

type BinderFormDialogProps = {
  mode: "create" | "modify";
  /** The binder being modified. Leave out when creating. */
  initialValues?: BinderValues;
  /** Rejects with a readable Error on failure; the dialog then shows it. */
  onSave: (values: BinderValues) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
};

/**
 * D-056: one dialog for "Create binder" and "Modify". The form keeps a local
 * draft (name and color); only `onSave` talks to the database.
 */
export default function BinderFormDialog({
  mode,
  initialValues,
  onSave,
  onClose,
  isSaving,
}: BinderFormDialogProps) {
  const initialName = initialValues?.name ?? "";
  const initialColor = initialValues
    ? coverColorOrDefault(initialValues.color)
    : DEFAULT_BINDER_COLOR;
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const colorGroupName = useId();

  // A color that is not in today's palette (for example after a palette
  // change) stays selectable as an extra "Current" swatch.
  const options: readonly BinderColorOption[] = BINDER_COLORS.some(
    (option) => option.value === initialColor,
  )
    ? BINDER_COLORS
    : [...BINDER_COLORS, { name: "Current", value: initialColor }];

  const trimmedName = name.trim();
  const isUnchanged =
    mode === "modify" &&
    trimmedName === initialName.trim() &&
    color === initialColor;

  // Focus the name field on open and give focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement;
    nameRef.current?.focus();
    nameRef.current?.select();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isSaving) return;
    setError(null);
    try {
      await onSave({ name: trimmedName, color });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The request failed.",
      );
    }
  }

  return (
    <div
      className="binder-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        className="binder-dialog binder-dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="binder-dialog__header">
          <h2 id={titleId} className="binder-dialog__title">
            {mode === "create" ? "Create binder" : "Modify binder"}
          </h2>
          <button
            type="button"
            className="binder-dialog__close"
            aria-label="Close binder dialog"
            onClick={onClose}
            disabled={isSaving}
          >
            ×
          </button>
        </header>

        <form
          className="binder-fields binder-form"
          onSubmit={(event) => void submit(event)}
        >
          <label className="field field--soft">
            Name
            <input
              className="field__input field__input--soft"
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              maxLength={100}
              required
            />
          </label>

          <fieldset className="binder-form__colors">
            <legend className="binder-form__legend">Cover color</legend>
            {options.map((option) => (
              <label key={option.value} className="binder-form__swatch">
                <input
                  type="radio"
                  className="binder-form__radio"
                  name={colorGroupName}
                  value={option.value}
                  checked={color === option.value}
                  onChange={() => setColor(option.value)}
                />
                <span
                  className="binder-form__chip"
                  style={{ backgroundColor: option.value }}
                  aria-hidden="true"
                />
                <span className="binder-form__swatch-name">{option.name}</span>
              </label>
            ))}
          </fieldset>

          {error && (
            <p className="binder-form__error" role="alert">
              {error}
            </p>
          )}

          <div className="binder-actions">
            <button
              type="submit"
              className="binder-button binder-button--primary"
              disabled={!trimmedName || isSaving || isUnchanged}
            >
              {isSaving
                ? "Saving…"
                : mode === "create"
                  ? "Create binder"
                  : "Save changes"}
            </button>
            <button type="button" className="binder-button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
