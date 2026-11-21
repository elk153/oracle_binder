/**
 * Types owned by the card renderer.
 *
 * The renderer is a two-step pipeline: a raw Scryfall card goes in,
 * `normalizeCard` turns it into a `NormalizedCard`, and every component
 * consumes only the normalized shape.
 *
 * The raw types list only the fields `normalizeCard` reads. They are kept
 * here, rather than imported from another feature, so the renderer stays
 * independent. TypeScript compares object types by their structure, so any
 * card type with these fields (e.g. `CardBrowserCard`) can be passed in.
 */
import type { CardShape } from "./scryfallCardLayouts.ts";

/** Degrees a face's block (image + text together) is turned to read it as printed. */
export type FaceRotation = 0 | 90 | 180 | 270;

export type RawImageUris = {
  normal?: string;
  large?: string;
};

/** A raw Scryfall face; single-faced cards keep these fields on the card itself. */
export type RawScryfallFace = {
  name: string;
  mana_cost?: string | null;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string | null;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: readonly string[];
  artist?: string;
  image_uris?: RawImageUris;
  /** Only set on reversible_card faces, where each face has its own layout. */
  layout?: string;
};

/** A related object in Scryfall's `all_parts` (meld pieces, tokens, ...). */
export type RawAllPart = {
  id: string;
  component: string;
  name: string;
  uri: string;
};

export type RawScryfallCard = Omit<RawScryfallFace, "layout"> & {
  id: string;
  layout: string;
  rarity?: string;
  keywords?: readonly string[];
  card_faces?: readonly RawScryfallFace[];
  all_parts?: readonly RawAllPart[];
};

/** One face in the renderer's flat, consistently named shape. */
export type NormalizedFace = {
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string;
  flavorText: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
  colors: readonly string[];
  rarity: string | null;
  artist: string | null;
  image: string | null;
  layout: string | null;
  rotation: FaceRotation;
};

export type NormalizedCard = {
  id: string;
  layout: string;
  shape: CardShape;
  name: string;
  /** Always at least one face; single-faced cards have exactly one. */
  faces: NormalizedFace[];
  allParts: readonly RawAllPart[] | null;
  /** Image on the root card object, used when a face has no image of its own. */
  rootImage: string | null;
  hasRotatedFaces: boolean;
};

/** Props shared by the shape components that `CardRenderer` dispatches to. */
export type ShapeComponentProps = {
  card: NormalizedCard;
  showDetailsMetadata?: boolean;
};
