import { useState } from "react";
import type { FormEvent } from "react";
import type { Binder } from "../binder/useBinders.ts";
import type { Deck } from "../decks/useDeckManagement.ts";
import {
  ACQUISITION_FORMATS,
  ACQUISITION_TYPES,
  CONDITIONS,
  LANGUAGES,
  optionalText,
} from "../binder/copyOptions.ts";
import type { AddSession, AddTarget, AddType } from "./addSession.ts";
import "./AddSessionSetup.css";

type AddSessionSetupProps = {
  binders: Binder[];
  decks: Deck[];
  // The current session when the user comes back to change it.
  initial: AddSession | null;
  onStart: (session: AddSession) => void;
};

// The target select stores one string per option: "loose", "binder:<id>" or
// "deck:<id>".
function targetValue(target: AddTarget | undefined): string {
  return !target || target.kind === "loose" ? "loose" : `${target.kind}:${target.id}`;
}

// Turns the select value back into a target, or null when the binder or
// deck no longer exists.
function toTarget(value: string, binders: Binder[], decks: Deck[]): AddTarget | null {
  if (value === "loose") {
    return { kind: "loose" };
  }
  const [kind, id] = value.split(":");
  const list = kind === "deck" ? decks : binders;
  const found = list.find((item) => item.id === id);
  if (!found) {
    return null;
  }
  return { kind: kind === "deck" ? "deck" : "binder", id: found.id, name: found.name };
}

const SELECT_OPTIONS: Array<{
  key: "acquisition_type" | "acquisition_format" | "condition" | "language";
  label: string;
  placeholder: string;
  options: readonly string[];
}> = [
  { key: "acquisition_type", label: "Acquisition type", placeholder: "Select type", options: ACQUISITION_TYPES },
  { key: "acquisition_format", label: "Acquisition format", placeholder: "Select format", options: ACQUISITION_FORMATS },
  { key: "condition", label: "Condition", placeholder: "Select condition", options: CONDITIONS },
  { key: "language", label: "Language", placeholder: "Select language", options: LANGUAGES },
];

// Session setup of the scanner's Add mode (D-064): where the cards go, owned
// or proxy, and copy details for every owned copy of the session.
export default function AddSessionSetup({ binders, decks, initial, onStart }: AddSessionSetupProps) {
  const [target, setTarget] = useState(targetValue(initial?.target));
  const [type, setType] = useState<AddType>(initial?.type ?? "owned");
  const defaults = initial?.defaults;
  const [choices, setChoices] = useState({
    acquisition_type: defaults?.acquisition_type ?? "",
    acquisition_format: defaults?.acquisition_format ?? "",
    condition: defaults?.condition ?? "",
    language: defaults?.language ?? "",
  });
  const [purchasePrice, setPurchasePrice] = useState(defaults?.purchase_price?.toString() ?? "");
  const [acquiredAt, setAcquiredAt] = useState(defaults?.acquired_at?.slice(0, 10) ?? "");
  const [location, setLocation] = useState(defaults?.location ?? "");
  const [notes, setNotes] = useState(defaults?.notes ?? "");

  // Derived, not stored: proxies exist only in decks, so any other target
  // means owned, whatever was picked before.
  const isDeck = target.startsWith("deck:");
  const effectiveType: AddType = isDeck ? type : "owned";
  const price = purchasePrice.trim() ? Number(purchasePrice) : null;
  const priceIsValid = price === null || (Number.isFinite(price) && price >= 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosenTarget = toTarget(target, binders, decks);
    if (!chosenTarget || !priceIsValid) {
      return;
    }
    onStart({
      target: chosenTarget,
      type: effectiveType,
      defaults: {
        acquisition_type: optionalText(choices.acquisition_type),
        acquisition_format: optionalText(choices.acquisition_format),
        condition: optionalText(choices.condition),
        language: optionalText(choices.language),
        purchase_price: price,
        acquired_at: acquiredAt ? `${acquiredAt}T00:00:00.000Z` : null,
        location: optionalText(location),
        notes: optionalText(notes),
      },
    });
  }

  return (
    <form className="scan-setup" onSubmit={submit}>
      <label className="field">
        Add to
        <select
          className="field__input"
          value={target}
          onChange={(event) => setTarget(event.currentTarget.value)}
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
                <option key={deck.id} value={`deck:${deck.id}`}>
                  {deck.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <fieldset className="scan-setup__types">
        <legend className="scan-setup__legend">Cards are</legend>
        <label className="scan-setup__type">
          <input
            type="radio"
            name="scan-add-type"
            value="owned"
            checked={effectiveType === "owned"}
            onChange={() => setType("owned")}
          />
          Owned copies
        </label>
        <label className="scan-setup__type">
          <input
            type="radio"
            name="scan-add-type"
            value="proxy"
            checked={effectiveType === "proxy"}
            disabled={!isDeck}
            onChange={() => setType("proxy")}
          />
          Proxies {isDeck ? "" : "(decks only)"}
        </label>
      </fieldset>

      {effectiveType === "owned" && (
        <details className="scan-setup__details">
          <summary className="scan-setup__summary">Copy details for every card (optional)</summary>
          <div className="scan-setup__fields">
            {SELECT_OPTIONS.map(({ key, label, placeholder, options }) => (
              <label key={key} className="field">
                {label}
                <select
                  className="field__input"
                  value={choices[key]}
                  onChange={(event) => {
                    const { value } = event.currentTarget;
                    setChoices((current) => ({ ...current, [key]: value }));
                  }}
                >
                  <option value="">{placeholder}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              Purchase price (EUR)
              <input
                className="field__input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.currentTarget.value)}
                aria-invalid={!priceIsValid}
              />
            </label>
            <label className="field">
              Acquired
              <input
                className="field__input"
                type="date"
                value={acquiredAt}
                onChange={(event) => setAcquiredAt(event.currentTarget.value)}
              />
            </label>
            <label className="field">
              Location
              <input
                className="field__input"
                value={location}
                onChange={(event) => setLocation(event.currentTarget.value)}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                className="field__input"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
              />
            </label>
          </div>
        </details>
      )}

      <button type="submit" className="page__action scan-setup__start" disabled={!priceIsValid}>
        Start scanning
      </button>
    </form>
  );
}
