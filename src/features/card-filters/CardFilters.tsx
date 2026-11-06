import { COLORS, RARITIES, SORT_DIRS, SORT_KEYS, filterParsers } from "./filterParams.ts";
import type { UseQueryStatesReturn, inferParserType } from "nuqs";
import useScrollVisibility from "../../hooks/useScrollVisibility.ts";
import {
  COLOR_LABELS,
  FILTER_CATEGORIES_BY_FEATURE,
  RARITY_LABELS,
  SORT_LABELS,
} from "./filterCategories.ts";
import type { FilterFeature } from "./filterCategories.ts";
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
}: Props) {
  const visible = useScrollVisibility({ threshold: 10, topGuard: 48 });
  const categories = FILTER_CATEGORIES_BY_FEATURE[feature];
  const isVisible = layout !== "floating" || visible;

  return (
    <section
      className={`card-filters${layout === "floating" ? " card-filters--floating" : ""}${isVisible ? "" : " card-filters--hidden"}`}
      aria-label="Card filters"
    >
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

      {categories.includes("sort") && (
        <div className="card-filters__group">
          <select
            aria-label="Sort by"
            value={filters.sort ?? ""}
            onChange={(e) =>
              setFilters({ sort: SORT_KEYS.find((key) => key === e.target.value) ?? null })
            }
          >
            <option value="">Sort: default</option>
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!filters.sort}
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
