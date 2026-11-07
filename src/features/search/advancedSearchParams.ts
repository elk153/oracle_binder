import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import {
  ADVANCED_COLORS,
  ADVANCED_RARITIES,
  COLOR_OPERATORS,
  FORMAT_FILTERS,
  IDENTITY_OPERATORS,
} from "./types.ts";

export const advancedSearchParsers = {
  s_name: parseAsString.withDefault(""),
  s_text: parseAsString.withDefault(""),
  s_type: parseAsString.withDefault(""),
  s_flavor: parseAsString.withDefault(""),
  s_colors: parseAsArrayOf(parseAsStringLiteral(ADVANCED_COLORS)).withDefault([]),
  s_colors_op: parseAsStringLiteral(COLOR_OPERATORS).withDefault("includes"),
  s_identity: parseAsArrayOf(parseAsStringLiteral(ADVANCED_COLORS)).withDefault([]),
  s_identity_op: parseAsStringLiteral(IDENTITY_OPERATORS).withDefault("includes"),
  s_mana: parseAsString.withDefault(""),
  s_formats: parseAsArrayOf(parseAsStringLiteral(FORMAT_FILTERS)).withDefault([]),
  s_rarity: parseAsArrayOf(parseAsStringLiteral(ADVANCED_RARITIES)).withDefault([]),
  s_price_min: parseAsFloat,
  s_price_max: parseAsFloat,
};
