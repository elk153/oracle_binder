import type { ApiParams } from "../../services/createApiClient.ts";
import type {
  AdvancedSearchFilters,
  ColorOperator,
  IdentityOperator,
} from "./types.ts";

const COMPARISON_OPERATOR: Record<ColorOperator, string> = {
  exactly: "=",
  includes: ">=",
  atmost: "<=",
};

const IDENTITY_COMPARISON_OPERATOR: Record<IdentityOperator, string> =
  COMPARISON_OPERATOR;

function quoteSearchValue(value: string): string {
  return `"${value.trim().replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function isValidManaSequence(value: string): boolean {
  return /^(?:\{[A-Za-z0-9]+(?:\/[A-Za-z0-9]+)?\})+$/i.test(value);
}

function isValidSetCode(value: string): boolean {
  return /^[a-z0-9]+$/i.test(value);
}

function priceTerm(operator: ">=" | "<=", value: number | null): string | null {
  return value !== null && Number.isFinite(value) && value >= 0
    ? `eur${operator}${value}`
    : null;
}

export function hasScryfallPriceFilter(
  filters: AdvancedSearchFilters,
): boolean {
  return (
    priceTerm(">=", filters.s_price_min) !== null ||
    priceTerm("<=", filters.s_price_max) !== null
  );
}

export function toScryfallQuery(filters: AdvancedSearchFilters): string {
  const terms: string[] = [];
  const addTextTerm = (operator: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) terms.push(`${operator}:${quoteSearchValue(trimmed)}`);
  };

  addTextTerm("name", filters.s_name);

  const setCode = filters.s_set.trim();
  if (setCode && isValidSetCode(setCode)) {
    terms.push(`set:${setCode.toLowerCase()}`);
  }

  addTextTerm("o", filters.s_text);
  addTextTerm("t", filters.s_type);
  addTextTerm("ft", filters.s_flavor);

  if (filters.s_colors.length > 0) {
    terms.push(
      `c${COMPARISON_OPERATOR[filters.s_colors_op]}${filters.s_colors.join("")}`,
    );
  }

  if (filters.s_identity.length > 0) {
    terms.push(
      `id${IDENTITY_COMPARISON_OPERATOR[filters.s_identity_op]}${filters.s_identity.join("")}`,
    );
  }

  const mana = filters.s_mana.trim();
  if (mana && isValidManaSequence(mana)) {
    terms.push(`m:${mana}`);
  }

  for (const formatFilter of filters.s_formats) {
    const [format, legality] = formatFilter.split(":");
    const operator =
      legality === "legal"
        ? "f"
        : legality === "restricted"
          ? "restricted"
          : "banned";
    terms.push(`${operator}:${format}`);
  }

  if (filters.s_rarity.length > 0) {
    terms.push(
      `(${filters.s_rarity.map((rarity) => `r:${rarity}`).join(" OR ")})`,
    );
  }

  const minimumPrice = priceTerm(">=", filters.s_price_min);
  const maximumPrice = priceTerm("<=", filters.s_price_max);
  if (minimumPrice) terms.push(minimumPrice);
  if (maximumPrice) terms.push(maximumPrice);

  return terms.join(" ");
}

export function toScryfallSearchParams(
  filters: AdvancedSearchFilters,
): ApiParams {
  const query = toScryfallQuery(filters);
  return {
    q: query,
    format: "json",
    ...(hasScryfallPriceFilter(filters) ? { unique: "prints" } : {}),
  };
}
