export type SearchSource = "scryfall" | "collection";

export type SearchMode = "simple" | "advanced";

export const ADVANCED_COLORS = ["W", "U", "B", "R", "G"] as const;
export type AdvancedColor = (typeof ADVANCED_COLORS)[number];

export const COLOR_OPERATORS = ["exactly", "includes", "atmost"] as const;
export type ColorOperator = (typeof COLOR_OPERATORS)[number];

export const IDENTITY_OPERATORS = ["exactly", "includes", "atmost"] as const;
export type IdentityOperator = (typeof IDENTITY_OPERATORS)[number];

export const ADVANCED_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "mythic",
  "special",
  "bonus",
] as const;
export type AdvancedRarity = (typeof ADVANCED_RARITIES)[number];

export const SCRYFALL_FORMATS = [
  "standard",
  "future",
  "historic",
  "timeless",
  "gladiator",
  "pioneer",
  "modern",
  "legacy",
  "pauper",
  "vintage",
  "penny",
  "commander",
  "oathbreaker",
  "standardbrawl",
  "brawl",
  "competitivebrawl",
  "alchemy",
  "paupercommander",
  "duel",
  "oldschool",
  "premodern",
  "predh",
  "tlr",
] as const;
export type ScryfallFormat = (typeof SCRYFALL_FORMATS)[number];

export const FORMAT_LEGALITIES = ["legal", "restricted", "banned"] as const;
export type FormatLegality = (typeof FORMAT_LEGALITIES)[number];

export const FORMAT_FILTERS = SCRYFALL_FORMATS.flatMap((format) =>
  FORMAT_LEGALITIES.map((legality) => `${format}:${legality}`),
) as `${ScryfallFormat}:${FormatLegality}`[];
export type FormatFilter = (typeof FORMAT_FILTERS)[number];

export type AdvancedSearchFilters = {
  s_name: string;
  s_set: string;
  s_text: string;
  s_type: string;
  s_flavor: string;
  s_colors: AdvancedColor[];
  s_colors_op: ColorOperator;
  s_identity: AdvancedColor[];
  s_identity_op: IdentityOperator;
  s_mana: string;
  s_formats: FormatFilter[];
  s_rarity: AdvancedRarity[];
  s_price_min: number | null;
  s_price_max: number | null;
};
