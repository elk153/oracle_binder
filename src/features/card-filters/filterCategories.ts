export type FilterFeature = "search" | "advancedSearch" | "collection" | "decks";
export type FilterCategory =
  | "colors"
  | "rarity"
  | "type"
  | "sort"
  | "place"
  | "kind";

export const FILTER_CATEGORIES_BY_FEATURE: Record<
  FilterFeature,
  readonly FilterCategory[]
> = {
  search: ["colors", "rarity", "type", "sort"],
  advancedSearch: ["colors", "rarity", "type", "sort"],
  collection: ["colors", "rarity", "type"],
  decks: ["colors", "type"],
};

export const COLOR_LABELS = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
} as const;

export const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
} as const;

export const SORT_LABELS = {
  name: "Name",
  cmc: "Mana value",
  rarity: "Rarity",
  price: "Price",
  place: "Place",
} as const;

export const KIND_LABELS = {
  owned: "Owned",
  proxy: "Proxy",
  virtual: "Virtual",
  favorite: "Favorite",
} as const;
