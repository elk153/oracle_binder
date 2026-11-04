import { useState, type FormEvent } from "react";
import type { Tables } from "../../types/database.ts";
import type {
  BinderCopy,
  BinderCopyUpdate,
} from "./useBinderCopies.ts";

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
>;

type BinderCopyFormProps = {
  cardName: string;
  binders: Binder[];
  initialCopy?: BinderCopy;
  onSave: (values: CopyFormValues) => void;
  onCancel: () => void;
  isSaving: boolean;
};

function dateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function BinderCopyForm({
  cardName,
  binders,
  initialCopy,
  onSave,
  onCancel,
  isSaving,
}: BinderCopyFormProps) {
  const [binderId, setBinderId] = useState(initialCopy?.binder_id ?? "");
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

    onSave({
      binder_id: binderId || null,
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
    <form className="binder-copy-form" onSubmit={submit}>
      <label>
        Card
        <input value={cardName} readOnly />
      </label>
      <label>
        Binder
        <select
          value={binderId}
          onChange={(event) => setBinderId(event.currentTarget.value)}
        >
          <option value="">Loose</option>
          {binders.map((binder) => (
            <option key={binder.id} value={binder.id}>
              {binder.name}
            </option>
          ))}
        </select>
      </label>
      {initialCopy ? (
        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.currentTarget.value)}
          >
            <option value="owned">Owned</option>
            <option value="sold">Sold</option>
            <option value="lost">Lost</option>
            <option value="given_away">Given away</option>
          </select>
        </label>
      ) : (
        <label>
          Status
          <input value="Owned" readOnly />
        </label>
      )}
      <label>
        Acquisition type
        <input value={acquisitionType} onChange={(e) => setAcquisitionType(e.currentTarget.value)} />
      </label>
      <label>
        Acquisition format
        <input value={acquisitionFormat} onChange={(e) => setAcquisitionFormat(e.currentTarget.value)} />
      </label>
      <label>
        Condition
        <input value={condition} onChange={(e) => setCondition(e.currentTarget.value)} />
      </label>
      <label>
        Finish
        <input value={finish} onChange={(e) => setFinish(e.currentTarget.value)} />
      </label>
      <label>
        Language
        <input value={language} onChange={(e) => setLanguage(e.currentTarget.value)} />
      </label>
      <label>
        Purchase price
        <input
          type="number"
          min="0"
          step="0.01"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.currentTarget.value)}
        />
      </label>
      <label>
        Acquired
        <input
          type="date"
          value={acquiredAt}
          onChange={(e) => setAcquiredAt(e.currentTarget.value)}
        />
      </label>
      <label>
        Location
        <input value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
      </label>
      <div className="binder-copy-form__actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save copy"}
        </button>
        <button type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
