import {
  getCardRenderConfig,
  AFTERMATH_ROTATION_OVERRIDE,
  BATTLE_ROTATION_OVERRIDE,
} from './scryfallCardLayouts.ts';
import type {
  FaceRotation,
  NormalizedCard,
  NormalizedFace,
  RawScryfallCard,
  RawScryfallFace,
  TextLanguage,
} from './types.ts';

/**
 * Normalize a single Scryfall face (or a single-faced root card) into a
 * flat, consistently-named object. Every renderer downstream consumes this
 * shape only — never the raw Scryfall field names directly.
 *
 * @param face - Raw face object (or the root card, for single-faced cards)
 * @param rotation - Degrees (0/90/180/270) to rotate this face's
 *   block (image + text together) to read it as printed. See
 *   ROTATION_BY_LAYOUT in scryfallCardLayouts.ts for how this is derived.
 * @param card - The root card, for fields that only exist there (rarity)
 *   or that a face may omit (colors).
 */
function toNormalizedFace(
  face: RawScryfallFace,
  rotation: FaceRotation,
  card: RawScryfallCard,
): NormalizedFace {
  return {
    name: face.name,
    manaCost: face.mana_cost ?? null,
    typeLine: face.type_line ?? '',
    oracleText: face.oracle_text ?? '',
    flavorText: face.flavor_text ?? null,
    power: face.power ?? null,
    toughness: face.toughness ?? null,
    loyalty: face.loyalty ?? null,
    defense: face.defense ?? null,
    colors: face.colors ?? card.colors ?? [],
    rarity: card.rarity ?? null,
    artist: face.artist ?? null,
    image: face.image_uris?.normal ?? face.image_uris?.large ?? null,
    // Only present on reversible_card faces — each face can have its own
    // layout (e.g. front = normal, back = saga). Consumers that render a
    // reversible_card face directly should re-run it through this same
    // normalization using this value.
    layout: face.layout ?? null,
    rotation,
    printedName: face.printed_name || null,
    printedTypeLine: face.printed_type_line || null,
    printedText: face.printed_text || null,
  };
}

/**
 * Normalize any Scryfall card object into a consistent structure:
 * always a `faces` array (length 1 for single-faced cards), a resolved
 * `shape` for component dispatch, and the raw `layout`/`allParts` kept
 * around for the rare cases that need them (extras widgets, meld).
 */
export function normalizeCard(card: RawScryfallCard): NormalizedCard {
  const config = getCardRenderConfig(card);

  // Aftermath split cards (e.g. "Destined // Lead by Example") only rotate
  // their second half — Scryfall exposes this as a keyword, not a distinct
  // layout, so it can't live in the static ROTATION_BY_LAYOUT table and has
  // to be checked here, per card.
  const isAftermath = card.layout === 'split' && (card.keywords?.includes('Aftermath') ?? false);
  const isBattle =
    card.layout === 'transform' && (card.card_faces?.[0]?.type_line?.startsWith('Battle') ?? false);
  const faceRotations =
    isAftermath ? AFTERMATH_ROTATION_OVERRIDE
    : isBattle ? BATTLE_ROTATION_OVERRIDE
    : config.faceRotations;

  const faces = card.card_faces?.length
    ? card.card_faces.map((face, index) => toNormalizedFace(face, faceRotations[index] ?? 0, card))
    : [toNormalizedFace(card, faceRotations[0] ?? 0, card)];

  return {
    id: card.id,
    layout: card.layout,
    shape: config.shape,
    name: card.name,
    faces,
    allParts: card.all_parts ?? null,
    // Fallback image for single-faced cards (card.image_uris lives on the
    // root object when there's no card_faces array).
    rootImage: card.image_uris?.normal ?? card.image_uris?.large ?? null,
    // Convenience flag for UI treatment (e.g. a "rotate your device" hint
    // on mobile) without every consumer having to scan card.faces itself.
    hasRotatedFaces: faces.some((face) => face.rotation !== 0),
  };
}

/** D-074: true when at least one face has printed (non-English) text. */
export function hasPrintedText(card: NormalizedCard): boolean {
  return card.faces.some(
    (face) => face.printedName !== null || face.printedTypeLine !== null || face.printedText !== null,
  );
}

/**
 * D-074: the card with the chosen text in `name`, `typeLine` and
 * `oracleText`, so the shape components need no change. "printed" uses each
 * printed field where Scryfall has it and keeps the English one where it
 * has not; "oracle" returns the card unchanged.
 */
export function withTextLanguage(card: NormalizedCard, language: TextLanguage): NormalizedCard {
  if (language === 'oracle' || !hasPrintedText(card)) return card;
  const faces = card.faces.map((face) => ({
    ...face,
    name: face.printedName ?? face.name,
    typeLine: face.printedTypeLine ?? face.typeLine,
    oracleText: face.printedText ?? face.oracleText,
  }));
  return { ...card, faces };
}
