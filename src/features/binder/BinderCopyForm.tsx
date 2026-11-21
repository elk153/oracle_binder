import { useState, type FormEvent } from "react";
import type { Tables } from "../../types/database.ts";
import type {
  BinderCopy,
  BinderCopyUpdate,
} from "./useBinderCopies.ts";
import type { Deck } from "../decks/useDeckManagement.ts";
import {
  ACQUISITION_FORMATS,
  ACQUISITION_TYPES,
  CONDITIONS,
  FINISHES,
  LANGUAGES,
  optionalText,
} from "./copyOptions.ts";

type Binder = Tables<"binders">;
export type CopyFormValues = Omit<
  BinderCopyUpdate,
  | "id"
  | "user_id"
  | "scryfall_id"
  | "rarity"
  | "created_at"
  | "updated_at"
  | "disposed_at"
  | "disposal_price"
> & { deck_id?: string | null };

type BinderCopyFormProps = {
  cardName: string;
  binders: Binder[];
  decks: Deck[];
  initialCopy?: BinderCopy;
  initialDeckId?: string;
  onSave: (values: CopyFormValues) => void;
  onCancel: () => void;
  isSaving: boolean;
};

const COPY_STATUSES = ["owned", "sold", "lost", "given_away"] as const;

function dateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function optionsWithCurrent(options: readonly string[], current: string): string[] {
  return current && !options.includes(current)
    ? [...options, current]
    : [...options];
}

function statusLabel(status: string): string {
  if (status === "given_away") return "Given away";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function BinderCopyForm({
  cardName,
  binders,
  decks,
  initialCopy,
  initialDeckId,
  onSave,
  onCancel,
  isSaving,
}: BinderCopyFormProps) {
  const [storageLocation, setStorageLocation] = useState(
    initialDeckId
      ? `deck:${initialDeckId}`
      : initialCopy?.binder_id
        ? `binder:${initialCopy.binder_id}`
        : "loose",
  );
  const [status, setStatus] = useState(initialCopy?.status ?? "owned");
  const [acquisitionType, setAcquisitionType] = useState(
    initialCopy?.acquisition_type ?? "",
  );
  const [acquisitionFormat, setAcquisitionFormat] = useState(
    initialCopy?.acquisition_format ?? "",
  );
  const [condition, setCondition] = useState(initialCopy?.condition ?? "");
  const [finish, setFinish] = useState(initialCopy?.finish ?? "");
  const [language, setLanguage] = useState(initialCopy?.language ?? "");
  const [purchasePrice, setPurchasePrice] = useState(
    initialCopy?.purchase_price?.toString() ?? "",
  );
  const [acquiredAt, setAcquiredAt] = useState(
    dateInputValue(initialCopy?.acquired_at),
  );
  const [location, setLocation] = useState(initialCopy?.location ?? "");
  const [notes, setNotes] = useState(initialCopy?.notes ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = purchasePrice.trim() ? Number(purchasePrice) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) return;

    const [destinationType, destinationId] = storageLocation.split(":");
    onSave({
      binder_id:
        destinationType === "binder" ? destinationId || null : null,
      deck_id: destinationType === "deck" ? destinationId || null : null,
      status,
      acquisition_type: optionalText(acquisitionType),
      acquisition_format: optionalText(acquisitionFormat),
      condition: optionalText(condition),
      finish: optionalText(finish),
      language: optionalText(language),
      purchase_price: price,
      acquired_at: acquiredAt ? `${acquiredAt}T00:00:00.000Z` : null,
      location: optionalText(location),
      notes: optionalText(notes),
    });
  }

  return (
    <form className="binder-fields binder-copy-form" onSubmit={submit}>
      <label className="field field--soft">
        Card
        <input className="field__input field__input--soft" value={cardName} readOnly />
      </label>
      <label className="field field--soft">
        Storage location
        <select
          className="field__input field__input--soft"
          value={storageLocation}
          onChange={(event) => setStorageLocation(event.currentTarget.value)}
        >
          <option value="loose">Loose</option>
          {binders.length > 0 && (
            <optgroup label="Binders">
              {binders.map((binder) => (
                <option key={binder.id} value={`binder:${binder.id}`}>
                  {binder.name}
                </option>
              ))}
            </optgroup>
          )}
          {decks.length > 0 && (
            <optgroup label="Decks">
              {decks.map((deck) => (
                <option
                  key={deck.id}
                  value={`deck:${deck.id}`}
                  disabled={status !== "owned"}
                >
                  {deck.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {initialCopy ? (
        <label className="field field--soft">
          Status
          <select
            className="field__input field__input--soft"
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value)}
          >
            {optionsWithCurrent(COPY_STATUSES, status).map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field field--soft">
          Status
          <input className="field__input field__input--soft" value="Owned" readOnly />
        </label>
      )}
      <label className="field field--soft">
        Acquisition type
        <select
          className="field__input field__input--soft"
          value={acquisitionType}
          onChange={(event) => setAcquisitionType(event.currentTarget.value)}
        >
          <option value="">Select type</option>
          {optionsWithCurrent(ACQUISITION_TYPES, acquisitionType).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--soft">
        Acquisition format
        <select
          className="field__input field__input--soft"
          value={acquisitionFormat}
          onChange={(event) => setAcquisitionFormat(event.currentTarget.value)}
        >
          <option value="">Select format</option>
          {optionsWithCurrent(ACQUISITION_FORMATS, acquisitionFormat).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--soft">
        Condition
        <select
          className="field__input field__input--soft"
          value={condition}
          onChange={(event) => setCondition(event.currentTarget.value)}
        >
          <option value="">Select condition</option>
          {optionsWithCurrent(CONDITIONS, condition).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--soft">
        Finish
        <select
          className="field__input field__input--soft"
          value={finish}
          onChange={(event) => setFinish(event.currentTarget.value)}
        >
          <option value="">Select finish</option>
          {optionsWithCurrent(FINISHES, finish).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--soft">
        Language
        <select
          className="field__input field__input--soft"
          value={language}
          onChange={(event) => setLanguage(event.currentTarget.value)}
        >
          <option value="">Select language</option>
          {optionsWithCurrent(LANGUAGES, language).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="field field--soft">
        Purchase price (EUR)
        <span className="binder-copy-form__price">
          <input
            className="field__input field__input--soft binder-copy-form__price-input"
            type="number"
            min="0"
            step="0.01"
            value={purchasePrice}
            onChange={(event) => setPurchasePrice(event.currentTarget.value)}
          />
          <span className="binder-copy-form__price-unit" aria-hidden="true">EUR</span>
        </span>
      </label>
      <label className="field field--soft">
        Acquired
        <input
          className="field__input field__input--soft binder-copy-form__date"
          type="date"
          value={acquiredAt}
          onChange={(e) => setAcquiredAt(e.currentTarget.value)}
        />
      </label>
      <label className="field field--soft">
        Location
        <input className="field__input field__input--soft" value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
      </label>
      <label className="field field--soft">
        Notes
        <textarea className="field__input field__input--soft binder-copy-form__notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
      </label>
      <div className="binder-actions">
        <button type="submit" className="binder-button binder-button--primary" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save copy"}
        </button>
        <button type="button" className="binder-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
