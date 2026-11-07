import {
  debounce,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

// "as const" keeps the exact strings, so TypeScript knows the allowed values.
export const COLORS = ["W", "U", "B", "R", "G", "C"] as const; // C = colorless
export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;
export const CARD_KINDS = ["owned", "proxy", "virtual", "favorite"] as const;
export const SORT_KEYS = ["name", "cmc", "rarity", "price", "place"] as const;
export const SORT_DIRS = ["asc", "desc"] as const;

// One parser per URL key. nuqs uses it to read AND write the key.
// Default values are never written to the URL (clean links).
export const filterParsers = {
  colors: parseAsArrayOf(parseAsStringLiteral(COLORS)).withDefault([]), // ?colors=W,U
  rarity: parseAsArrayOf(parseAsStringLiteral(RARITIES)).withDefault([]), // ?rarity=rare
  type: parseAsString
    .withDefault("") // ?type=creature
    .withOptions({ limitUrlUpdates: debounce(300) }), // state is instant, URL waits 300 ms
  place: parseAsArrayOf(parseAsString).withDefault([]),
  kind: parseAsArrayOf(parseAsStringLiteral(CARD_KINDS)).withDefault([]),
  sort: parseAsStringLiteral(SORT_KEYS), // no default: null = Scryfall's order
  dir: parseAsStringLiteral(SORT_DIRS).withDefault("asc"),
};
