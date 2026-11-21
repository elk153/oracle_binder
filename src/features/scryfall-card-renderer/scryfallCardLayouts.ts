/**
 * Scryfall card `layout` values mapped to rendering configuration.
 * Source: https://scryfall.com/docs/api/layouts
 *
 * Shape: [layoutKey, LayoutDescription][]
 *
 * LayoutDescription fields (see the type below):
 * - label             Human-readable name
 * - hasCardFaces      Whether the card object will have a `card_faces` array
 * - faceCount         Number of distinct faces to render (0 = use root card fields)
 * - faceRelation      'none' | 'related' | 'unrelated' | 'meld' | 'split'
 *                      - related: faces belong to one gameplay object (transform, modal_dfc, split, flip, adventure...)
 *                      - unrelated: two independent cards printed back-to-back (reversible_card, double_faced_token, art_series)
 *                      - meld: needs `all_parts` to find the meld result
 * - interaction       Gameplay/UI behavior hint, used to pick a component
 * - component         Suggested React component name
 * - layoutDirection   'stacked' | 'sideBySide' | 'flipVertical' | 'frontBack' | 'horizontal'
 * - needsAllParts     Whether `all_parts` must be fetched/resolved to render fully (meld, some tokens/emblems)
 * - notes             Implementation notes
 *
 * SCRYFALL_CARD_LAYOUT_MAP (bottom of this file) adds two derived fields to
 * each description, giving a full LayoutConfig:
 * - shape             One of CARD_SHAPES, used for component dispatch
 * - faceRotations     Degrees[] to rotate each face's block to read it as printed (see ROTATION_BY_LAYOUT)
 */
import type { FaceRotation } from './types.ts';

export type LayoutDescription = {
  label: string;
  hasCardFaces: boolean;
  faceCount: number;
  faceRelation: 'none' | 'related' | 'unrelated' | 'meld' | 'split';
  interaction: string;
  component: string;
  layoutDirection: 'stacked' | 'sideBySide' | 'flipVertical' | 'frontBack' | 'horizontal';
  needsAllParts: boolean;
  notes: string;
};

export type LayoutConfig = LayoutDescription & {
  shape: CardShape;
  faceRotations: readonly FaceRotation[];
};

// Kept as its own constant because it is also the fallback config for
// unknown or future layouts (see getCardRenderConfig).
const NORMAL_LAYOUT: LayoutDescription = {
  label: 'Normal',
  hasCardFaces: false,
  faceCount: 0,
  faceRelation: 'none',
  interaction: 'standard',
  component: 'NormalCard',
  layoutDirection: 'stacked',
  needsAllParts: false,
  notes: 'Single face, all fields on the root card object.',
};

export const SCRYFALL_CARD_LAYOUTS: ReadonlyArray<readonly [string, LayoutDescription]> = [
  ['normal', NORMAL_LAYOUT],

  ['split', {
    label: 'Split',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'related',
    interaction: 'choose-one-side-to-cast',
    component: 'SplitCard',
    layoutDirection: 'sideBySide',
    needsAllParts: false,
    notes: 'Render both halves side by side (rotate text 90deg to mimic print). Fuse split cards can be cast as both.',
  }],

  ['flip', {
    label: 'Flip',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'related',
    interaction: 'flip-in-place-180',
    component: 'FlipCard',
    layoutDirection: 'flipVertical',
    needsAllParts: false,
    notes: 'Single image, two text halves printed upside-down relative to each other. Toggle which half is "active".',
  }],

  ['transform', {
    label: 'Transform',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'related',
    interaction: 'flip-to-back-side',
    component: 'TransformCard',
    layoutDirection: 'frontBack',
    needsAllParts: false,
    notes: 'Two full-art faces on separate images. Show a flip/transform button toggling card_faces[0] <-> card_faces[1].',
  }],

  ['modal_dfc', {
    label: 'Modal DFC',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'related',
    interaction: 'choose-one-side-to-cast',
    component: 'ModalDfcCard',
    layoutDirection: 'frontBack',
    needsAllParts: false,
    notes: 'Like transform visually, but either face can be cast directly (not just after entering battlefield).',
  }],

  ['meld', {
    label: 'Meld',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'meld',
    interaction: 'combine-with-partner',
    component: 'MeldCard',
    layoutDirection: 'stacked',
    needsAllParts: true,
    notes: 'Resolve `all_parts` to find the meld_result and the other meld part(s); offer a link/preview to the combined card.',
  }],

  ['leveler', {
    label: 'Leveler',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'level-up-thresholds',
    component: 'LevelerCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face, but oracle_text/power/toughness change across level brackets — render the level-up stat table.',
  }],

  ['class', {
    label: 'Class',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'stacked-ability-levels',
    component: 'ClassCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face enchantment with a vertical list of leveled abilities and mana costs; render as an expanding list.',
  }],

  ['case', {
    label: 'Case',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'condition-then-effect',
    component: 'CaseCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face enchantment with labeled sections (To Solve / Solved). Render as sectioned text blocks.',
  }],

  ['saga', {
    label: 'Saga',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'chapter-sequence',
    component: 'SagaCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face with numbered chapter abilities (I, II, III...) — render as a vertical chapter tracker.',
  }],

  ['adventure', {
    label: 'Adventure',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'related',
    interaction: 'choose-one-side-to-cast',
    component: 'AdventureCard',
    layoutDirection: 'sideBySide',
    needsAllParts: false,
    notes: 'One creature/permanent face + one instant/sorcery "adventure" face on the same card image; both in card_faces.',
  }],

  ['prepare', {
    label: 'Prepare',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'split',
    interaction: 'cast-half',
    component: 'SplitCard',
    layoutDirection: 'horizontal',
    needsAllParts: false,
    notes: 'Split card with two spell halves stored in card_faces. Only the Prepare half may be cast from hand; the Fight half has aftermath and is cast from the graveyard.',
  }],

  ['mutate', {
    label: 'Mutate',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'stack-onto-creature',
    component: 'MutateCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face; oracle_text has a mutate cost line + mutate trigger separated by a divider — render both segments.',
  }],

  ['prototype', {
    label: 'Prototype',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'alternate-cost-stats',
    component: 'PrototypeCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face with an alternate mana cost + P/T box shown alongside the normal cost/stats.',
  }],

  ['battle', {
    label: 'Battle',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'defense-counter',
    component: 'BattleCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face, landscape orientation; render with a defense counter indicator.',
  }],

  ['planar', {
    label: 'Planar',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'planechase-only',
    component: 'PlanarCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Plane/Phenomenon card, landscape orientation, no mana cost. Planechase-format only.',
  }],

  ['scheme', {
    label: 'Scheme',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'archenemy-only',
    component: 'SchemeCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Archenemy-format only, no mana cost, portrait card with large text box.',
  }],

  ['vanguard', {
    label: 'Vanguard',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'vanguard-only',
    component: 'VanguardCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Vanguard-format only; shows hand-size/life modifiers instead of mana cost.',
  }],

  ['token', {
    label: 'Token',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'standard',
    component: 'TokenCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'No mana cost; often linked back to the card(s) that create it via `all_parts`.',
  }],

  ['double_faced_token', {
    label: 'Double-Faced Token',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'unrelated',
    interaction: 'flip-to-back-side',
    component: 'DoubleFacedTokenCard',
    layoutDirection: 'frontBack',
    needsAllParts: false,
    notes: 'Two independent tokens printed back-to-back; treat each card_faces entry as its own token.',
  }],

  ['emblem', {
    label: 'Emblem',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'standard',
    component: 'EmblemCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'No mana cost, not a physical game card; render like a token with an "Emblem" badge.',
  }],

  ['augment', {
    label: 'Augment',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'attach-stat-boost',
    component: 'AugmentCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face; oracle_text lead with the augment reminder text (from Unstable). Treat like a normal card visually.',
  }],

  ['host', {
    label: 'Host',
    hasCardFaces: false,
    faceCount: 0,
    faceRelation: 'none',
    interaction: 'pairs-with-augment',
    component: 'HostCard',
    layoutDirection: 'stacked',
    needsAllParts: false,
    notes: 'Single face creature meant to be paired with an Augment card; render as a normal creature card.',
  }],

  ['art_series', {
    label: 'Art Series',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'unrelated',
    interaction: 'flip-to-back-side',
    component: 'ArtSeriesCard',
    layoutDirection: 'frontBack',
    needsAllParts: false,
    notes: 'Collectible art card, no gameplay text; two unrelated art images on card_faces, no oracle text to render.',
  }],

  ['reversible_card', {
    label: 'Reversible Card',
    hasCardFaces: true,
    faceCount: 2,
    faceRelation: 'unrelated',
    interaction: 'flip-to-back-side',
    component: 'ReversibleCard',
    layoutDirection: 'frontBack',
    needsAllParts: false,
    notes: 'Two fully independent card printings on one piece of stock (e.g. Secret Lair). Each card_faces entry has ' +
      'its own `layout` — recurse into this same config to render each face correctly.',
  }],
];

/**
 * The 24 layouts collapse into a small set of *rendering shapes*.
 * Almost everything that differs between layouts is either "how many
 * faces, and how do you switch between them" (shape) or a small bolt-on
 * widget (saga chapters, class levels, etc — handled separately, see
 * components/extras/). Components should dispatch on `shape`, not `layout`.
 */
export const CARD_SHAPES = {
  ONE_FACE: 'ONE_FACE',           // single face, optional "extras" widget
  TOGGLE_FACES: 'TOGGLE_FACES',   // two faces, flip/toggle button
  SPLIT_FACES: 'SPLIT_FACES',     // two faces, shown side by side
  FLIP_VERTICAL: 'FLIP_VERTICAL', // one image, two text states, 180deg rotate
  MELD: 'MELD',                   // one face + resolve all_parts for the result
} as const;

/** One of the CARD_SHAPES values: 'ONE_FACE' | 'TOGGLE_FACES' | ... */
export type CardShape = (typeof CARD_SHAPES)[keyof typeof CARD_SHAPES];

// Partial: layouts not listed fall back to ONE_FACE below.
const SHAPE_BY_LAYOUT: Partial<Record<string, CardShape>> = {
  normal: CARD_SHAPES.ONE_FACE,
  leveler: CARD_SHAPES.ONE_FACE,
  class: CARD_SHAPES.ONE_FACE,
  case: CARD_SHAPES.ONE_FACE,
  saga: CARD_SHAPES.ONE_FACE,
  mutate: CARD_SHAPES.ONE_FACE,
  prototype: CARD_SHAPES.ONE_FACE,
  battle: CARD_SHAPES.ONE_FACE,
  planar: CARD_SHAPES.ONE_FACE,
  scheme: CARD_SHAPES.ONE_FACE,
  vanguard: CARD_SHAPES.ONE_FACE,
  token: CARD_SHAPES.ONE_FACE,
  emblem: CARD_SHAPES.ONE_FACE,
  augment: CARD_SHAPES.ONE_FACE,
  host: CARD_SHAPES.ONE_FACE,

  transform: CARD_SHAPES.TOGGLE_FACES,
  modal_dfc: CARD_SHAPES.TOGGLE_FACES,
  double_faced_token: CARD_SHAPES.TOGGLE_FACES,
  art_series: CARD_SHAPES.TOGGLE_FACES,
  reversible_card: CARD_SHAPES.TOGGLE_FACES,

  split: CARD_SHAPES.SPLIT_FACES,
  adventure: CARD_SHAPES.SPLIT_FACES,
  prepare: CARD_SHAPES.SPLIT_FACES,

  flip: CARD_SHAPES.FLIP_VERTICAL,

  meld: CARD_SHAPES.MELD,
};

/**
 * Per-face reading rotation, in degrees, indexed the same way as
 * `card_faces` (faceRotations[0] -> faces[0], etc). This is orthogonal to
 * `shape`: shape says how faces are *arranged* on screen (stacked,
 * side-by-side, toggled...), rotation says how much a given face's block
 * (image + text together) must be turned to be read as printed.
 *
 * This is why `adventure` and `split` are NOT treated the same here even
 * though they share the SPLIT_FACES shape above: adventure's two parts are
 * both printed upright on one face (no rotation), while split cards are
 * physically printed sideways and require turning the card to read either
 * half — same visual arrangement, different physical printing.
 *
 * Layouts not listed default to [0] (no rotation) via the fallback below.
 */
const ROTATION_BY_LAYOUT: Partial<Record<string, readonly FaceRotation[]>> = {
  // Classic split (e.g. "Fire // Ice"): each half is printed rotated a
  // quarter turn, in opposite directions, so turning the whole card one
  // way reads the left half and the other way reads the right half.
  // NOTE: the exact sign (which half is +90 vs -90/270) depends on how
  // Scryfall orders card_faces and how your image assets are cropped —
  // verify against a real render and flip the pair below if it looks wrong.
  split: [90, 90],

  // Flip (e.g. "Budoka Gardener // Dokai, Weaver of Life"): one physical
  // image, second face's text is printed upside-down relative to the first.
  flip: [0, 180],

  // Adventure (e.g. "Bonecrusher Giant // Stomp"): both parts printed
  // upright on the same face — no rotation, despite sharing a shape with split.
  adventure: [0, 0],
};

// Aftermath split cards (e.g. "Destined // Lead by Example") only rotate
// their *second* half — the first half reads normally like any other card,
// since it's cast from hand before the aftermath half is ever relevant.
// Scryfall doesn't expose this as a separate layout, only as a keyword, so
// it has to be special-cased at normalization time rather than in this
// static table — see normalizeCard.ts.
export const AFTERMATH_ROTATION_OVERRIDE: readonly FaceRotation[] = [0, 270];

// Transform Battle card override
// Front face is in landscape, back face is normal.
export const BATTLE_ROTATION_OVERRIDE: readonly FaceRotation[] = [90, 0];

// Combine a layout's description with its derived `shape` and
// `faceRotations`, so a LayoutConfig is the single source of truth
// (config.shape / config.faceRotations) instead of extra lookup tables
// callers need to know about. Building a new object keeps the description
// tables above unchanged.
function toLayoutConfig(layout: string, description: LayoutDescription): LayoutConfig {
  return {
    ...description,
    shape: SHAPE_BY_LAYOUT[layout] ?? CARD_SHAPES.ONE_FACE,
    faceRotations: ROTATION_BY_LAYOUT[layout] ?? [0],
  };
}

/** Convenience Map for O(1) lookup by layout key. */
export const SCRYFALL_CARD_LAYOUT_MAP: ReadonlyMap<string, LayoutConfig> = new Map(
  SCRYFALL_CARD_LAYOUTS.map(([layout, description]) => [
    layout,
    toLayoutConfig(layout, description),
  ]),
);

const FALLBACK_LAYOUT_CONFIG = toLayoutConfig('normal', NORMAL_LAYOUT);

/**
 * Get the render config for a given Scryfall card object.
 * Falls back to the 'normal' config for unknown/future layouts.
 */
export function getCardRenderConfig(card: { layout?: string } | null | undefined): LayoutConfig {
  return SCRYFALL_CARD_LAYOUT_MAP.get(card?.layout ?? '') ?? FALLBACK_LAYOUT_CONFIG;
}