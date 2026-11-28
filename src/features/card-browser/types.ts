import type { ScryfallCard } from "../card-filters/types.ts";
import type { ApiRecord } from "../../services/createApiClient.ts";

export type CardSource<TCard = ApiRecord> = {
  cards: TCard[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
};

export type CardImageUris = {
  normal?: string;
  large?: string;
  art_crop?: string;
};

export type CardBrowserFace = {
  name: string;
  artist?: string;
  image_uris?: CardImageUris;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  layout?: string;
  colors?: ScryfallCard["colors"];
  // D-074: the face as printed, on non-English printings when Scryfall has it.
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
};

export type CardBrowserCard = Omit<ScryfallCard, "card_faces" | "prices"> & {
  layout: string;
  // Scryfall's finishes of this printing ("nonfoil", "foil", "etched").
  // Not checked by isCardBrowserCard; read it with Array.isArray.
  finishes?: unknown;
  image_uris?: CardImageUris;
  card_faces?: CardBrowserFace[];
  set?: string;
  set_name?: string;
  collector_number?: string;
  released_at?: string;
  prices?: {
    eur?: string | null;
    eur_foil?: string | null;
  };
  rulings_uri?: string;
  prints_search_uri?: string;
  legalities?: Record<string, string>;
  artist?: string;
  oracle_text?: string;
  flavor_text?: string;
  color_identity?: ScryfallCard["colors"];
  mana_cost?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  // D-074: Scryfall's language code of this printing ("en", "fr", ...) and
  // the card as printed in that language, when Scryfall has it.
  lang?: string;
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
};

export type CardAction = "favorite" | "binder" | "deck";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImageUris(value: unknown): value is CardImageUris {
  if (!isRecord(value)) return false;
  return ["normal", "large", "art_crop"].every(
    (key) => !(key in value) || typeof value[key] === "string",
  );
}

function isOptionalString(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || typeof value[key] === "string";
}

function isColorArray(value: unknown): value is NonNullable<ScryfallCard["colors"]> {
  return (
    Array.isArray(value) &&
    value.every((color) => ["W", "U", "B", "R", "G"].includes(String(color)))
  );
}

function isCardFace(value: unknown): value is CardBrowserFace {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    (!("image_uris" in value) || isImageUris(value.image_uris)) &&
    ["artist", "mana_cost", "type_line", "oracle_text", "flavor_text", "power", "toughness", "loyalty", "defense", "layout", "printed_name", "printed_type_line", "printed_text"].every(
      (key) => isOptionalString(value, key),
    ) &&
    (!("colors" in value) || isColorArray(value.colors))
  );
}

export function isCardBrowserCard(value: unknown): value is CardBrowserCard {
  if (!isRecord(value)) return false;

  const prices = value.prices;
  const pricesValid =
    !("prices" in value) ||
    (isRecord(prices) &&
      ["eur", "eur_foil"].every(
        (key) =>
          !(key in prices) ||
          typeof prices[key] === "string" ||
          prices[key] === null,
      ));
  const legalitiesValid =
    !("legalities" in value) ||
    (isRecord(value.legalities) &&
      Object.values(value.legalities).every((legality) => typeof legality === "string"));

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.layout === "string" &&
    typeof value.rarity === "string" &&
    ["set", "set_name", "collector_number", "released_at", "artist", "oracle_text", "flavor_text", "mana_cost", "power", "toughness", "loyalty", "defense", "rulings_uri", "prints_search_uri", "lang", "printed_name", "printed_type_line", "printed_text"].every(
      (key) => isOptionalString(value, key),
    ) &&
    (!("cmc" in value) || typeof value.cmc === "number") &&
    (!("type_line" in value) || typeof value.type_line === "string") &&
    (!("colors" in value) || isColorArray(value.colors)) &&
    (!("color_identity" in value) || isColorArray(value.color_identity)) &&
    (!("image_uris" in value) || isImageUris(value.image_uris)) &&
    (!("card_faces" in value) ||
      (Array.isArray(value.card_faces) && value.card_faces.every(isCardFace))) &&
    pricesValid &&
    legalitiesValid
  );
}
