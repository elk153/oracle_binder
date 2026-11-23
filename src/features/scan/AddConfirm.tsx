import { useId, useMemo, useState } from "react";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import { isCardBrowserCard } from "../card-browser/types.ts";
import type { CardBrowserCard } from "../card-browser/types.ts";
import { FINISHES, LANGUAGES } from "../binder/copyOptions.ts";
import { guessFinish } from "./addSession.ts";
import type { Finish } from "./addSession.ts";
import { languageNameOf } from "./parseCollectorLine.ts";
import type { FinishAndLanguage } from "./parseCollectorLine.ts";
import "./AddConfirm.css";

export type { Finish };

export type AddConfirmation = {
  card: CardBrowserCard; // the printing to add, possibly changed by the user
  finish: Finish | null; // null for proxies, which have no finish
  language: string | null; // the copies' language; null for none or proxies
  quantity: number;
};

type AddConfirmProps = {
  card: CardBrowserCard; // the recognized printing
  showFinish: boolean; // owned copies only
  choosePrinting?: boolean; // open the printing list at once (card found by name)
  // Read on the card (D-066): pre-select the finish and the language.
  read?: FinishAndLanguage;
  defaultLanguage?: string | null; // the session's language, used when none was read
  onConfirm: (confirmation: AddConfirmation) => void;
  onSkip: () => void;
};

const MAX_QUANTITY = 20;

function imageOf(card: CardBrowserCard): string | undefined {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

function printingLabel(card: CardBrowserCard): string {
  const set = card.set_name ?? card.set?.toUpperCase() ?? "Unknown set";
  return `${set} #${card.collector_number ?? "?"}`;
}

// Confirm step of the scanner's Add mode (D-064), shown over the camera for
// each recognized card: check the printing (and change it), pick the finish
// and the quantity, then confirm or skip.
export default function AddConfirm({
  card,
  showFinish,
  choosePrinting = false,
  read = { foilMark: null, language: null },
  defaultLanguage = null,
  onConfirm,
  onSkip,
}: AddConfirmProps) {
  const [printing, setPrinting] = useState(card);
  const [isChoosingPrinting, setIsChoosingPrinting] = useState(choosePrinting);
  // Each card starts at the finish guessed from its foil mark (D-066).
  const [finishIndex, setFinishIndex] = useState(() =>
    FINISHES.indexOf(guessFinish(read.foilMark, card.finishes)),
  );
  // The printed language wins over the session default when the app knows it.
  const readLanguage = languageNameOf(read.language);
  const [language, setLanguage] = useState(readLanguage ?? defaultLanguage ?? "");
  const languageId = useId();
  const [quantity, setQuantity] = useState(1);
  const finishId = useId();

  // The printings load only once "Change printing" is opened: no URL, no
  // request. Same query key as the card details overlay, so they share the
  // cache.
  const printsQuery = useFetchUrl(
    "cardPrints",
    isChoosingPrinting ? card.prints_search_uri : undefined,
  );
  const prints = useMemo(
    () => (printsQuery.data ?? []).filter(isCardBrowserCard),
    [printsQuery.data],
  );

  const image = imageOf(printing);

  return (
    <section className="scan-confirm" aria-label={`Add ${printing.name}`}>
      <div className="scan-confirm__card">
        {image && <img className="scan-confirm__image" src={image} alt="" />}
        <div className="scan-confirm__details">
          <h2 className="scan-confirm__name">{printing.name}</h2>
          <p className="scan-confirm__printing">{printingLabel(printing)}</p>
          {!isChoosingPrinting && (
            <button
              type="button"
              className="scan-confirm__change"
              onClick={() => setIsChoosingPrinting(true)}
            >
              Change printing
            </button>
          )}
        </div>
      </div>

      {isChoosingPrinting && (
        <label className="field">
          Printing
          {printsQuery.isLoading ? (
            <span className="scan-confirm__hint" role="status">Loading printings…</span>
          ) : printsQuery.error ? (
            <span className="scan-confirm__hint" role="alert">
              Could not load printings: {printsQuery.error.message}
            </span>
          ) : (
            <select
              className="field__input"
              value={printing.id}
              onChange={(event) => {
                const chosen = prints.find((print) => print.id === event.currentTarget.value);
                if (chosen) {
                  setPrinting(chosen);
                }
              }}
            >
              {prints.map((print) => (
                <option key={print.id} value={print.id}>
                  {printingLabel(print)}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      {showFinish && (
        <div className="field">
          <label htmlFor={finishId}>Finish</label>
          <input
            id={finishId}
            className="scan-confirm__slider"
            type="range"
            min={0}
            max={FINISHES.length - 1}
            step={1}
            value={finishIndex}
            aria-valuetext={FINISHES[finishIndex]}
            onChange={(event) => setFinishIndex(Number(event.currentTarget.value))}
          />
          <div className="scan-confirm__finish-labels" aria-hidden="true">
            {FINISHES.map((finish, index) => (
              <span
                key={finish}
                className={`scan-confirm__finish-label${
                  index === finishIndex ? " scan-confirm__finish-label--active" : ""
                }`}
              >
                {finish}
              </span>
            ))}
          </div>
        </div>
      )}

      {showFinish && (
        <div className="field">
          <label htmlFor={languageId}>
            Language
            {readLanguage && language === readLanguage && (
              <span className="scan-confirm__hint"> (read on the card)</span>
            )}
          </label>
          <select
            id={languageId}
            className="field__input"
            value={language}
            onChange={(event) => setLanguage(event.currentTarget.value)}
          >
            <option value="">Not set</option>
            {LANGUAGES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="scan-confirm__quantity">
        <span className="scan-confirm__quantity-label">Quantity</span>
        <button
          type="button"
          className="page__control page__button scan-confirm__step"
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          disabled={quantity <= 1}
          aria-label="One less"
        >
          −
        </button>
        <output className="scan-confirm__count" aria-live="polite">
          {quantity}
        </output>
        <button
          type="button"
          className="page__control page__button scan-confirm__step"
          onClick={() => setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))}
          disabled={quantity >= MAX_QUANTITY}
          aria-label="One more"
        >
          +
        </button>
      </div>

      <div className="scan-confirm__actions">
        <button
          type="button"
          className="page__action scan-confirm__confirm"
          onClick={() =>
            onConfirm({
              card: printing,
              finish: showFinish ? FINISHES[finishIndex] : null,
              language: showFinish && language ? language : null,
              quantity,
            })
          }
        >
          Add {quantity}
        </button>
        <button type="button" className="page__control page__button" onClick={onSkip}>
          Skip
        </button>
      </div>
    </section>
  );
}
