import type { CardBrowserCard } from "../card-browser/types.ts";
import type { AdvancedSearchFilters, ColorOperator } from "./types.ts";
import {
  isValidManaSequence,
  isValidPrice,
  isValidSetCode,
} from "./toScryfallQuery.ts";

/*
 * D-052: the local twin of `toScryfallQuery`.
 *
 * Scryfall searches are answered by Scryfall; collection cards are already
 * downloaded, so this pure function (same input, same output, no React, no
 * network) decides whether one card passes the same filters. Keep it in
 * sync with `toScryfallQuery.ts`: the blocks below follow the same field
 * order, and invalid input is ignored by the same shared validators.
 * `tests/search/matchesAdvancedFilters.test.ts` checks both with one table.
 */

type TextKey = "oracle_text" | "type_line" | "flavor_text";

/** One piece of text and the name of the card face that owns it. */
type TextSource = { text: string; name: string };

/**
 * Scryfall matches text on any face, so check the card itself and each face.
 * (Double-faced cards keep their text on the faces only.)
 */
function textSources(card: CardBrowserCard, key: TextKey): TextSource[] {
  const sources: TextSource[] = [];
  const own = card[key];
  if (own !== undefined) sources.push({ text: own, name: card.name });
  for (const face of card.card_faces ?? []) {
    const faceText = face[key];
    if (faceText !== undefined) sources.push({ text: faceText, name: face.name });
  }
  return sources;
}

/** Case-insensitive "contains". An empty term means "no filter". */
function matchesText(
  card: CardBrowserCard,
  key: TextKey,
  term: string,
  expandCardName = false,
): boolean {
  const needle = term.trim();
  if (!needle) return true;

  return textSources(card, key).some(({ text, name }) => {
    // In Scryfall text searches, ~ stands for the card's own name.
    const wanted = expandCardName ? needle.replaceAll("~", name) : needle;
    return text.toLocaleLowerCase().includes(wanted.toLocaleLowerCase());
  });
}

/** Mirrors Scryfall's `=`, `>=` and `<=` on sets of colors. */
function matchesColors(
  cardColors: readonly string[],
  selected: readonly string[],
  operator: ColorOperator,
): boolean {
  if (selected.length === 0) return true;

  const have = new Set(cardColors);
  const wanted = new Set(selected);
  switch (operator) {
    case "exactly":
      return have.size === wanted.size && [...wanted].every((c) => have.has(c));
    case "includes":
      return [...wanted].every((c) => have.has(c));
    case "atmost":
      return [...have].every((c) => wanted.has(c));
  }
}

function countSymbols(cost: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const symbol of cost.toUpperCase().match(/\{[^}]+\}/g) ?? []) {
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  }
  return counts;
}

/** True when `cost` has every wanted symbol at least as many times. */
function costContains(
  cost: string | undefined,
  wanted: ReadonlyMap<string, number>,
): boolean {
  if (cost === undefined) return false;
  const have = countSymbols(cost);
  return [...wanted].every(([symbol, count]) => (have.get(symbol) ?? 0) >= count);
}

/** `f:` accepts legal and restricted; `restricted:` and `banned:` are exact. */
function matchesFormat(card: CardBrowserCard, entry: string): boolean {
  const [format, status] = entry.split(":");
  const legality = card.legalities?.[format];
  if (status === "legal") return legality === "legal" || legality === "restricted";
  if (status === "restricted") return legality === "restricted";
  return legality === "banned";
}

export default function matchesAdvancedFilters(
  card: CardBrowserCard,
  filters: AdvancedSearchFilters,
): boolean {
  // name:
  const name = filters.s_name.trim();
  if (name && !card.name.toLocaleLowerCase().includes(name.toLocaleLowerCase())) {
    return false;
  }

  // set:
  const setCode = filters.s_set.trim();
  if (
    setCode &&
    isValidSetCode(setCode) &&
    card.set?.toLocaleLowerCase() !== setCode.toLocaleLowerCase()
  ) {
    return false;
  }

  // o: (oracle text), t: (type line), ft: (flavor text)
  if (!matchesText(card, "oracle_text", filters.s_text, true)) return false;
  if (!matchesText(card, "type_line", filters.s_type)) return false;
  if (!matchesText(card, "flavor_text", filters.s_flavor)) return false;

  // c: colors fall back to the front face, like `columns.ts`.
  const colors = card.colors ?? card.card_faces?.[0]?.colors ?? [];
  if (!matchesColors(colors, filters.s_colors, filters.s_colors_op)) return false;

  // id: color identity
  if (
    !matchesColors(
      card.color_identity ?? [],
      filters.s_identity,
      filters.s_identity_op,
    )
  ) {
    return false;
  }

  // m: the cost on the card or on any face must contain the chosen symbols.
  const mana = filters.s_mana.trim();
  if (mana && isValidManaSequence(mana)) {
    const wanted = countSymbols(mana);
    const costs = [card.mana_cost, ...(card.card_faces ?? []).map((f) => f.mana_cost)];
    if (!costs.some((cost) => costContains(cost, wanted))) return false;
  }

  // f: / restricted: / banned: (every chosen format must match)
  if (!filters.s_formats.every((entry) => matchesFormat(card, entry))) return false;

  // r: any of the chosen rarities
  if (
    filters.s_rarity.length > 0 &&
    !filters.s_rarity.some((rarity) => rarity === card.rarity)
  ) {
    return false;
  }

  // eur>= / eur<=: a card without a EUR price never passes a price bound.
  const eur = card.prices?.eur;
  const price = eur ? Number(eur) : undefined;
  const { s_price_min: min, s_price_max: max } = filters;
  if (isValidPrice(min) && !(price !== undefined && price >= min)) return false;
  if (isValidPrice(max) && !(price !== undefined && price <= max)) return false;

  return true;
}
