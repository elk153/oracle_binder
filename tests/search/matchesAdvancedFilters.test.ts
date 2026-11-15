/*
 * D-052: keeps `toScryfallQuery` and `matchesAdvancedFilters` in sync.
 *
 * Run from the repository root (Node 22, no dependency, not part of
 * `npm run typecheck` or `npm run lint`'s TypeScript project):
 *
 *   node --experimental-strip-types --test tests/
 *
 * Each case in the table below states two facts about the same filters:
 *   1. the Scryfall query string `toScryfallQuery` must build, and
 *   2. which fixture cards `matchesAdvancedFilters` must keep.
 * If one implementation changes without the other, a named case fails.
 *
 * The fixtures are small hand-written cards, not live Scryfall data. Two
 * rules were checked on scryfall.com on 2026-11-08: `m:R` finds Char
 * ({2}{R}), so `m:` means "contains at least"; `f:vintage` finds Black
 * Lotus (restricted), so `f:` accepts restricted cards.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import matchesAdvancedFilters from "../../src/features/search/matchesAdvancedFilters.ts";
import { toScryfallQuery } from "../../src/features/search/toScryfallQuery.ts";
import type { CardBrowserCard } from "../../src/features/card-browser/types.ts";
import type { AdvancedSearchFilters } from "../../src/features/search/types.ts";

const CARDS: CardBrowserCard[] = [
  {
    id: "bolt",
    name: "Lightning Bolt",
    layout: "normal",
    rarity: "common",
    set: "m10",
    type_line: "Instant",
    mana_cost: "{R}",
    oracle_text: "Lightning Bolt deals 3 damage to any target.",
    flavor_text: "A spark of rage.",
    colors: ["R"],
    color_identity: ["R"],
    legalities: { modern: "legal", vintage: "legal", legacy: "legal" },
    prices: { eur: "1.50" },
  },
  {
    id: "char",
    name: "Char",
    layout: "normal",
    rarity: "uncommon",
    set: "ima",
    type_line: "Sorcery",
    mana_cost: "{2}{R}",
    oracle_text: "Char deals 4 damage to any target and 2 damage to you.",
    colors: ["R"],
    color_identity: ["R"],
    legalities: { modern: "legal", vintage: "legal", legacy: "legal" },
    prices: { eur: "0.50" },
  },
  {
    id: "lotus",
    name: "Black Lotus",
    layout: "normal",
    rarity: "rare",
    set: "lea",
    type_line: "Artifact",
    mana_cost: "{0}",
    oracle_text: "{T}, Sacrifice Black Lotus: Add three mana of any one color.",
    colors: [],
    color_identity: [],
    legalities: { modern: "not_legal", vintage: "restricted", legacy: "banned" },
    prices: { eur: "250000.00" },
  },
  {
    // Double-faced: colors, cost, type and text live on the faces only.
    id: "delver",
    name: "Delver of Secrets // Insectile Aberration",
    layout: "transform",
    rarity: "common",
    set: "isd",
    color_identity: ["U"],
    card_faces: [
      {
        name: "Delver of Secrets",
        mana_cost: "{U}",
        type_line: "Creature — Human Wizard",
        oracle_text: "At the beginning of your upkeep, you may transform Delver of Secrets.",
        colors: ["U"],
      },
      {
        name: "Insectile Aberration",
        type_line: "Creature — Human Insect",
        oracle_text: "Flying",
        colors: ["U"],
      },
    ],
    legalities: { modern: "legal", vintage: "legal", legacy: "legal" },
    prices: { eur: "0.20" },
  },
  {
    // No EUR price: must never pass a price bound.
    id: "niv",
    name: "Niv-Mizzet, Parun",
    layout: "normal",
    rarity: "rare",
    set: "grn",
    type_line: "Legendary Creature — Dragon Wizard",
    mana_cost: "{U}{U}{R}{R}",
    oracle_text: "Flying\nWhenever you draw a card, Niv-Mizzet, Parun deals 1 damage to any target.",
    colors: ["U", "R"],
    color_identity: ["U", "R"],
    legalities: { modern: "legal", vintage: "legal", legacy: "legal" },
    prices: { eur: null },
  },
];

const NO_FILTERS: AdvancedSearchFilters = {
  s_name: "",
  s_set: "",
  s_text: "",
  s_type: "",
  s_flavor: "",
  s_colors: [],
  s_colors_op: "includes",
  s_identity: [],
  s_identity_op: "includes",
  s_mana: "",
  s_formats: [],
  s_rarity: [],
  s_price_min: null,
  s_price_max: null,
};

const ALL = ["bolt", "char", "lotus", "delver", "niv"];

type Case = {
  name: string;
  filters: Partial<AdvancedSearchFilters>;
  query: string;
  matches: string[];
};

const cases: Case[] = [
  { name: "no filters keep every card", filters: {}, query: "", matches: ALL },

  // name:
  { name: "name is a case-insensitive substring", filters: { s_name: "LIGHTNING" }, query: 'name:"LIGHTNING"', matches: ["bolt"] },
  { name: "name matches the back face of a double-faced card", filters: { s_name: "insectile" }, query: 'name:"insectile"', matches: ["delver"] },

  // set:
  { name: "set code is case-insensitive", filters: { s_set: "ISD" }, query: "set:isd", matches: ["delver"] },
  { name: "invalid set code is ignored by both", filters: { s_set: "is d" }, query: "", matches: ALL },

  // o: ~ t: ft:
  { name: "oracle text substring", filters: { s_text: "damage" }, query: 'o:"damage"', matches: ["bolt", "char", "niv"] },
  { name: "~ stands for the card name", filters: { s_text: "~ deals 3 damage" }, query: 'o:"~ deals 3 damage"', matches: ["bolt"] },
  { name: "~ uses the face name on faces", filters: { s_text: "transform ~" }, query: 'o:"transform ~"', matches: ["delver"] },
  { name: "oracle text is checked on every face", filters: { s_text: "flying" }, query: 'o:"flying"', matches: ["delver", "niv"] },
  { name: "type line on front and back faces", filters: { s_type: "wizard" }, query: 't:"wizard"', matches: ["delver", "niv"] },
  { name: "type line on the back face only", filters: { s_type: "insect" }, query: 't:"insect"', matches: ["delver"] },
  { name: "flavor text", filters: { s_flavor: "spark" }, query: 'ft:"spark"', matches: ["bolt"] },

  // c:
  { name: "colors include", filters: { s_colors: ["R"] }, query: "c>=R", matches: ["bolt", "char", "niv"] },
  { name: "colors exactly", filters: { s_colors: ["U", "R"], s_colors_op: "exactly" }, query: "c=UR", matches: ["niv"] },
  { name: "colors at most keeps colorless", filters: { s_colors: ["U"], s_colors_op: "atmost" }, query: "c<=U", matches: ["lotus", "delver"] },
  { name: "colors fall back to the front face", filters: { s_colors: ["U"] }, query: "c>=U", matches: ["delver", "niv"] },

  // id:
  { name: "identity include", filters: { s_identity: ["U"] }, query: "id>=U", matches: ["delver", "niv"] },
  { name: "identity at most", filters: { s_identity: ["R"], s_identity_op: "atmost" }, query: "id<=R", matches: ["bolt", "char", "lotus"] },

  // m:
  { name: "mana contains a symbol", filters: { s_mana: "{R}" }, query: "m:{R}", matches: ["bolt", "char", "niv"] },
  { name: "mana counts repeated symbols", filters: { s_mana: "{R}{R}" }, query: "m:{R}{R}", matches: ["niv"] },
  { name: "mana generic symbol", filters: { s_mana: "{2}{R}" }, query: "m:{2}{R}", matches: ["char"] },
  { name: "mana is checked on every face", filters: { s_mana: "{U}" }, query: "m:{U}", matches: ["delver", "niv"] },
  { name: "invalid mana is ignored by both", filters: { s_mana: "2WW" }, query: "", matches: ALL },

  // f:
  { name: "legal includes restricted", filters: { s_formats: ["vintage:legal"] }, query: "f:vintage", matches: ALL },
  { name: "legal excludes not_legal", filters: { s_formats: ["modern:legal"] }, query: "f:modern", matches: ["bolt", "char", "delver", "niv"] },
  { name: "restricted is exact", filters: { s_formats: ["vintage:restricted"] }, query: "restricted:vintage", matches: ["lotus"] },
  { name: "banned is exact", filters: { s_formats: ["legacy:banned"] }, query: "banned:legacy", matches: ["lotus"] },
  { name: "every chosen format must match", filters: { s_formats: ["modern:legal", "vintage:legal"] }, query: "f:modern f:vintage", matches: ["bolt", "char", "delver", "niv"] },

  // r:
  { name: "any chosen rarity", filters: { s_rarity: ["rare", "mythic"] }, query: "(r:rare OR r:mythic)", matches: ["lotus", "niv"] },

  // eur
  { name: "price minimum skips unpriced cards", filters: { s_price_min: 1 }, query: "eur>=1", matches: ["bolt", "lotus"] },
  { name: "price maximum skips unpriced cards", filters: { s_price_max: 1 }, query: "eur<=1", matches: ["char", "delver"] },
  { name: "price range", filters: { s_price_min: 0.3, s_price_max: 2 }, query: "eur>=0.3 eur<=2", matches: ["bolt", "char"] },
  { name: "negative price is ignored by both", filters: { s_price_min: -1 }, query: "", matches: ALL },

  // all together
  {
    name: "several fields combine with AND",
    filters: { s_set: "m10", s_text: "damage", s_colors: ["R"], s_rarity: ["common"] },
    query: 'set:m10 o:"damage" c>=R (r:common)',
    matches: ["bolt"],
  },
];

for (const { name, filters, query, matches } of cases) {
  test(name, () => {
    const full: AdvancedSearchFilters = { ...NO_FILTERS, ...filters };

    assert.equal(toScryfallQuery(full), query, "Scryfall query string");

    const kept = CARDS.filter((card) => matchesAdvancedFilters(card, full)).map(
      (card) => card.id,
    );
    assert.deepEqual(kept, matches, "cards kept by the local matcher");
  });
}
