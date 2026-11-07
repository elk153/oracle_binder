import { useMemo } from "react";
import {
  CARD_KINDS,
  COLORS,
  RARITIES,
  SORT_DIRS,
  SORT_KEYS,
  filterParsers,
} from "./filterParams.ts";
import type { UseQueryStatesReturn, inferParserType } from "nuqs";
import useScrollVisibility from "../../hooks/useScrollVisibility.ts";
import {
  COLOR_LABELS,
  FILTER_CATEGORIES_BY_FEATURE,
  KIND_LABELS,
  RARITY_LABELS,
  SORT_LABELS,
} from "./filterCategories.ts";
import type { FilterFeature } from "./filterCategories.ts";
import {
  binderPlaceFilterValue,
  deckPlaceFilterValue,
} from "./types.ts";
import type { CardPlaces } from "./types.ts";
import "./CardFilters.css";

type Filters = inferParserType<typeof filterParsers>;

type Props = {
  filters: Filters;
  setFilters: UseQueryStatesReturn<typeof filterParsers>[1];
  onReset: () => void;
  shown: number;
  total: number;
  feature?: FilterFeature;
  layout?: "inline" | "floating";
  cardPlaces?: CardPlaces;
};

// Add the value if missing, remove it if present.
const toggle = <T extends string>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function CardFilters({
  filters,
  setFilters,
  onReset,
  shown,
  total,
  feature = "search",
  layout = "inline",
  cardPlaces,
}: Props) {
  const visible = useScrollVisibility({ threshold: 10, topGuard: 48 });
  const placeOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const place of cardPlaces?.values() ?? []) {
      for (const binder of place.binders) {
        options.set(binderPlaceFilterValue(binder.id), `Binder: ${binder.name}`);
      }
      for (const deck of place.decks) {
        options.set(deckPlaceFilterValue(deck.id), `Deck: ${deck.name}`);
      }
    }
    return [...options].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cardPlaces]);
  const categories = [
    ...FILTER_CATEGORIES_BY_FEATURE[feature],
    ...(cardPlaces && placeOptions.length ? (["place"] as const) : []),
    ...(cardPlaces ? (["kind"] as const) : []),
  ];
  const sortKeys = cardPlaces
    ? SORT_KEYS
    : SORT_KEYS.filter((key) => key !== "place");
  const activeSort = filters.sort === "place" && !cardPlaces ? null : filters.sort;
  const isVisible = layout !== "floating" || visible;

  return (
    <section
      className={`card-filters${layout === "floating" ? " card-filters--floating" : ""}${isVisible ? "" : " card-filters--hidden"}`}
      aria-label="Filter & sort"
    >
      <h2 className="card-filters__heading">Filter &amp; sort</h2>
      {categories.includes("colors") && (
        <div className="card-filters__group" role="group" aria-label="Colors">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={COLOR_LABELS[color]}
              title={COLOR_LABELS[color]}
              aria-pressed={filters.colors.includes(color)}
              onClick={() => setFilters({ colors: toggle(filters.colors, color) })}
            >
              {COLOR_LABELS[color]}
            </button>
          ))}
        </div>
      )}

      {categories.includes("rarity") && (
        <div className="card-filters__group" role="group" aria-label="Rarity">
          {RARITIES.map((rarity) => (
            <button
              key={rarity}
              type="button"
              aria-pressed={filters.rarity.includes(rarity)}
              onClick={() => setFilters({ rarity: toggle(filters.rarity, rarity) })}
            >
              {RARITY_LABELS[rarity]}
            </button>
          ))}
        </div>
      )}

      {categories.includes("type") && (
        <input
          type="search"
          placeholder="Type (e.g. creature)"
          aria-label="Filter by card type"
          value={filters.type}
          onChange={(e) => setFilters({ type: e.target.value })}
        />
      )}

      {categories.includes("place") && (
        <div className="card-filters__group" role="group" aria-label="Place">
          {placeOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filters.place.includes(value)}
              onClick={() =>
                setFilters({ place: toggle(filters.place, value) })
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {categories.includes("kind") && (
        <div className="card-filters__group" role="group" aria-label="Kind">
          {CARD_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filters.kind.includes(kind)}
              onClick={() =>
                setFilters({ kind: toggle(filters.kind, kind) })
              }
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      )}

      {categories.includes("sort") && (
        <div className="card-filters__group">
          <select
            aria-label="Sort by"
            value={activeSort ?? ""}
            onChange={(e) =>
              setFilters({ sort: SORT_KEYS.find((key) => key === e.target.value) ?? null })
            }
          >
            <option value="">Sort: default</option>
            {sortKeys.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!activeSort}
            aria-label={`Sort ${filters.dir === "asc" ? "descending" : "ascending"}`}
            onClick={() => setFilters({ dir: filters.dir === SORT_DIRS[0] ? "desc" : "asc" })}
          >
            {filters.dir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      )}

      <p className="card-filters__count">
        {shown} of {total} cards
        <button type="button" onClick={onReset}>
          Clear
        </button>
      </p>
    </section>
  );
}
