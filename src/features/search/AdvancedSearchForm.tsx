import { useMemo, useState, type FormEvent } from "react";
import { useQueryStates } from "nuqs";
import useFetchUrl from "../../hooks/useFetchUrl.ts";
import useCardSymbols, { type CardSymbol } from "../../hooks/useCardSymbols.ts";
import { isScryfallSet, type ScryfallSet } from "../card-browser/mulliganSets.ts";
import NameAutocomplete from "./NameAutocomplete.tsx";
import { advancedSearchParsers } from "./advancedSearchParams.ts";
import { isValidManaSequence } from "./toScryfallQuery.ts";
import {
  ADVANCED_COLORS,
  ADVANCED_RARITIES,
  COLOR_OPERATORS,
  FORMAT_LEGALITIES,
  IDENTITY_OPERATORS,
  SCRYFALL_FORMATS,
  type AdvancedColor,
  type AdvancedRarity,
  type AdvancedSearchFilters,
  type ColorOperator,
  type FormatFilter,
  type IdentityOperator,
} from "./types.ts";
import "./AdvancedSearchForm.css";

const COLOR_NAMES: Record<AdvancedColor, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

const OPERATOR_LABELS: Record<ColorOperator | IdentityOperator, string> = {
  exactly: "Exactly these",
  includes: "Includes these",
  atmost: "At most these",
};

/**
 * What the person is typing. It is only copied to the URL when they press
 * Search (D-050: one request per search, not one per keystroke). Prices stay
 * strings here because an empty <input> is "", not null.
 */
type Draft = {
  name: string;
  set: string;
  text: string;
  type: string;
  flavor: string;
  colors: AdvancedColor[];
  colorsOp: ColorOperator;
  identity: AdvancedColor[];
  identityOp: IdentityOperator;
  mana: string;
  formats: FormatFilter[];
  rarity: AdvancedRarity[];
  priceMin: string;
  priceMax: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  set: "",
  text: "",
  type: "",
  flavor: "",
  colors: [],
  colorsOp: "includes",
  identity: [],
  identityOp: "includes",
  mana: "",
  formats: [],
  rarity: [],
  priceMin: "",
  priceMax: "",
};

const NO_DATA: unknown[] = [];

/** Builds the form's starting values from the filters currently in the URL. */
function toDraft(
  filters: AdvancedSearchFilters,
  sets: readonly ScryfallSet[],
): Draft {
  const code = filters.s_set.toLocaleLowerCase();
  // The URL holds a set code; the field shows the set name when it is known.
  const set = sets.find((item) => item.code.toLocaleLowerCase() === code);
  return {
    name: filters.s_name,
    set: set?.name ?? filters.s_set,
    text: filters.s_text,
    type: filters.s_type,
    flavor: filters.s_flavor,
    colors: filters.s_colors,
    colorsOp: filters.s_colors_op,
    identity: filters.s_identity,
    identityOp: filters.s_identity_op,
    mana: filters.s_mana,
    formats: filters.s_formats,
    rarity: filters.s_rarity,
    priceMin: filters.s_price_min === null ? "" : String(filters.s_price_min),
    priceMax: filters.s_price_max === null ? "" : String(filters.s_price_max),
  };
}

/** Returns the matching option, typed as the union, or undefined. */
function findLiteral<T extends string>(
  options: readonly T[],
  value: string,
): T | undefined {
  return options.find((option) => option === value);
}

function toggleItem<T>(list: readonly T[], item: T): T[] {
  return list.includes(item)
    ? list.filter((current) => current !== item)
    : [...list, item];
}

function parsePrice(value: string): number | null {
  const price = Number.parseFloat(value);
  return value.trim() !== "" && Number.isFinite(price) && price >= 0
    ? price
    : null;
}

/** Shows a symbol string such as {2}{U}{U} as Scryfall's symbol images. */
function SymbolString({
  value,
  symbolsByText,
}: {
  value: string;
  symbolsByText: ReadonlyMap<string, CardSymbol>;
}) {
  const tokens = value.match(/\{[^}]+\}/g) ?? [];
  return (
    <>
      {tokens.map((token, index) => {
        const symbol = symbolsByText.get(token);
        return symbol ? (
          <img
            key={`${token}-${index}`}
            className="advanced-search__symbol"
            src={symbol.svg_uri}
            alt={symbol.english}
          />
        ) : (
          <span key={`${token}-${index}`}>{token}</span>
        );
      })}
    </>
  );
}

type AdvancedSearchFormProps = {
  nameSuggestions: readonly string[];
};

export default function AdvancedSearchForm({
  nameSuggestions,
}: AdvancedSearchFormProps) {
  const [filters, setFilters] = useQueryStates(advancedSearchParsers);
  const { symbols, error: symbolsError } = useCardSymbols();
  // Same query key as the prefetch in App.tsx, so this reads the cache.
  const setsQuery = useFetchUrl("scryfallSets", "https://api.scryfall.com/sets");
  const sets = useMemo(
    () => (setsQuery.data ?? NO_DATA).filter(isScryfallSet),
    [setsQuery.data],
  );
  const setNames = useMemo(() => sets.map((item) => item.name), [sets]);
  const [draft, setDraft] = useState<Draft>(() => toDraft(filters, sets));
  const [setError, setSetError] = useState<string | null>(null);
  const [formatChoice, setFormatChoice] = useState<string>(SCRYFALL_FORMATS[0]);
  const [legalityChoice, setLegalityChoice] = useState<string>(
    FORMAT_LEGALITIES[0],
  );

  const symbolsByText = useMemo(
    () => new Map(symbols.map((symbol) => [symbol.symbol, symbol])),
    [symbols],
  );
  const textSymbols = useMemo(
    () => symbols.filter((symbol) => !symbol.funny),
    [symbols],
  );
  // Only symbols the query builder accepts in a mana cost (no {T}, no {20}).
  const manaSymbols = useMemo(
    () =>
      symbols.filter(
        (symbol) =>
          symbol.appears_in_mana_costs &&
          !symbol.funny &&
          isValidManaSequence(symbol.symbol),
      ),
    [symbols],
  );

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function appendSymbol(field: "text" | "mana", symbol: string) {
    if (!symbol) return;
    setDraft((current) => ({ ...current, [field]: current[field] + symbol }));
  }

  function addFormat() {
    const format = findLiteral(SCRYFALL_FORMATS, formatChoice);
    const legality = findLiteral(FORMAT_LEGALITIES, legalityChoice);
    if (!format || !legality) return;
    const entry: FormatFilter = `${format}:${legality}`;
    if (draft.formats.includes(entry)) return;
    update({ formats: [...draft.formats, entry] });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The field shows a set name; Scryfall's `set:` operator needs its code.
    // A code typed directly is accepted too.
    const typedSet = draft.set.trim().toLocaleLowerCase();
    let setCode = "";
    if (typedSet) {
      const match = sets.find(
        (item) =>
          item.name.toLocaleLowerCase() === typedSet ||
          item.code.toLocaleLowerCase() === typedSet,
      );
      if (!match) {
        setSetError(`Unknown set “${draft.set.trim()}”. Pick one from the suggestions.`);
        return;
      }
      setCode = match.code;
    }
    setSetError(null);

    void setFilters({
      s_name: draft.name.trim(),
      s_set: setCode,
      s_text: draft.text.trim(),
      s_type: draft.type.trim(),
      s_flavor: draft.flavor.trim(),
      s_colors: draft.colors,
      s_colors_op: draft.colorsOp,
      s_identity: draft.identity,
      s_identity_op: draft.identityOp,
      s_mana: draft.mana,
      s_formats: draft.formats,
      s_rarity: draft.rarity,
      s_price_min: parsePrice(draft.priceMin),
      s_price_max: parsePrice(draft.priceMax),
    });
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setSetError(null);
    void setFilters(null); // null clears every s_ parameter from the URL
  }

  return (
    <form className="advanced-search" role="search" onSubmit={submit}>
      <div className="advanced-search__grid">
        <NameAutocomplete
          label="Card name"
          names={nameSuggestions}
          value={draft.name}
          onChange={(name) => update({ name })}
        />

        <div>
          <NameAutocomplete
            label="Set"
            placeholder="Search set names"
            names={setNames}
            value={draft.set}
            onChange={(set) => update({ set })}
          />
          {setError && (
            <p className="advanced-search__error" role="alert">
              {setError}
            </p>
          )}
        </div>

        <label className="advanced-search__field">
          <span>Type line</span>
          <input
            type="text"
            placeholder="e.g. legendary creature"
            value={draft.type}
            onChange={(event) => update({ type: event.currentTarget.value })}
          />
        </label>

        <label className="advanced-search__field">
          <span>Flavor text</span>
          <input
            type="text"
            value={draft.flavor}
            onChange={(event) => update({ flavor: event.currentTarget.value })}
          />
        </label>

        <label className="advanced-search__field">
          <span>Text on card</span>
          <input
            type="text"
            placeholder="e.g. draw a card"
            value={draft.text}
            onChange={(event) => update({ text: event.currentTarget.value })}
          />
        </label>

        <label className="advanced-search__field">
          <span>Insert a symbol in the text</span>
          <select
            value=""
            disabled={textSymbols.length === 0}
            onChange={(event) =>
              appendSymbol("text", event.currentTarget.value)
            }
          >
            <option value="">Choose a symbol…</option>
            {textSymbols.map((symbol) => (
              <option key={symbol.symbol} value={symbol.symbol}>
                {symbol.symbol} — {symbol.english}
              </option>
            ))}
          </select>
        </label>

        <div className="advanced-search__field">
          <span id="advanced-mana-label">Mana cost</span>
          <div className="advanced-search__mana">
            <output
              className="advanced-search__mana-value"
              aria-labelledby="advanced-mana-label"
            >
              {draft.mana ? (
                <SymbolString value={draft.mana} symbolsByText={symbolsByText} />
              ) : (
                <span className="advanced-search__hint">No symbols yet</span>
              )}
            </output>
            <button
              type="button"
              className="advanced-search__secondary"
              onClick={() => update({ mana: "" })}
              disabled={!draft.mana}
            >
              Clear
            </button>
          </div>
          <select
            aria-labelledby="advanced-mana-label"
            value=""
            disabled={manaSymbols.length === 0}
            onChange={(event) => appendSymbol("mana", event.currentTarget.value)}
          >
            <option value="">Add a symbol…</option>
            {manaSymbols.map((symbol) => (
              <option key={symbol.symbol} value={symbol.symbol}>
                {symbol.symbol} — {symbol.english}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="advanced-search__fieldset">
          <legend>Colors</legend>
          <div className="advanced-search__options">
            {ADVANCED_COLORS.map((color) => (
              <label key={color}>
                <input
                  type="checkbox"
                  checked={draft.colors.includes(color)}
                  onChange={() =>
                    update({ colors: toggleItem(draft.colors, color) })
                  }
                />
                {COLOR_NAMES[color]}
              </label>
            ))}
          </div>
          <label className="advanced-search__field">
            <span>Match</span>
            <select
              value={draft.colorsOp}
              onChange={(event) => {
                const colorsOp = findLiteral(
                  COLOR_OPERATORS,
                  event.currentTarget.value,
                );
                if (colorsOp) update({ colorsOp });
              }}
            >
              {COLOR_OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="advanced-search__fieldset">
          <legend>Color identity</legend>
          <div className="advanced-search__options">
            {ADVANCED_COLORS.map((color) => (
              <label key={color}>
                <input
                  type="checkbox"
                  checked={draft.identity.includes(color)}
                  onChange={() =>
                    update({ identity: toggleItem(draft.identity, color) })
                  }
                />
                {COLOR_NAMES[color]}
              </label>
            ))}
          </div>
          <label className="advanced-search__field">
            <span>Match</span>
            <select
              value={draft.identityOp}
              onChange={(event) => {
                const identityOp = findLiteral(
                  IDENTITY_OPERATORS,
                  event.currentTarget.value,
                );
                if (identityOp) update({ identityOp });
              }}
            >
              {IDENTITY_OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {OPERATOR_LABELS[operator]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="advanced-search__fieldset">
          <legend>Rarity</legend>
          <div className="advanced-search__options">
            {ADVANCED_RARITIES.map((rarity) => (
              <label key={rarity} className="advanced-search__capitalize">
                <input
                  type="checkbox"
                  checked={draft.rarity.includes(rarity)}
                  onChange={() =>
                    update({ rarity: toggleItem(draft.rarity, rarity) })
                  }
                />
                {rarity}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="advanced-search__fieldset">
          <legend>Price (EUR)</legend>
          <div className="advanced-search__prices">
            <label className="advanced-search__field">
              <span>Min</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.priceMin}
                onChange={(event) =>
                  update({ priceMin: event.currentTarget.value })
                }
              />
            </label>
            <label className="advanced-search__field">
              <span>Max</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.priceMax}
                onChange={(event) =>
                  update({ priceMax: event.currentTarget.value })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="advanced-search__fieldset advanced-search__fieldset--wide">
          <legend>Format legality</legend>
          <div className="advanced-search__formats">
            <label className="advanced-search__field">
              <span>Format</span>
              <select
                value={formatChoice}
                onChange={(event) => setFormatChoice(event.currentTarget.value)}
              >
                {SCRYFALL_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
            <label className="advanced-search__field">
              <span>Status</span>
              <select
                value={legalityChoice}
                onChange={(event) =>
                  setLegalityChoice(event.currentTarget.value)
                }
              >
                {FORMAT_LEGALITIES.map((legality) => (
                  <option key={legality} value={legality}>
                    {legality}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="advanced-search__secondary"
              onClick={addFormat}
            >
              Add
            </button>
          </div>
          {draft.formats.length > 0 && (
            <ul className="advanced-search__chips" aria-label="Selected formats">
              {draft.formats.map((entry) => (
                <li key={entry}>
                  {entry.replace(":", " · ")}
                  <button
                    type="button"
                    aria-label={`Remove ${entry}`}
                    onClick={() =>
                      update({ formats: draft.formats.filter((f) => f !== entry) })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>

      {(symbolsError || setsQuery.error) && (
        <p className="advanced-search__error" role="status">
          Some lists are unavailable:{" "}
          {[symbolsError, setsQuery.error]
            .filter((error) => error !== null)
            .map((error) => error.message)
            .join("; ")}
        </p>
      )}

      <div className="advanced-search__actions">
        <button type="submit" className="advanced-search__submit">
          Search
        </button>
        <button
          type="button"
          className="advanced-search__secondary"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
