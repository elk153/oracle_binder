// Geometry and texts of the scanner's guide frame (D-061).
//
// All positions are fractions (0 to 1), so they work at any size:
// - CARD_RECT is relative to the camera view box (3:4 portrait);
// - the zones are relative to the card outline.
// The OCR (D-062) cuts its strips out of the video at exactly these zones,
// so the frame drawn on screen and the area read always agree.

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Aspect ratio of the camera view box (width / height). ScanCamera.css uses
// the same value.
export const VIEW_RATIO = 3 / 4;

// A Magic card is 63 × 88 mm.
export const CARD_RATIO = 63 / 88;

// The outline nearly fills the view (96% of its height), so the user holds
// the card close and the small collector text gets enough camera pixels for
// the OCR. Its width follows from the card shape: as a fraction of the view
// width it is height × CARD_RATIO / VIEW_RATIO. Centered in both directions.
const CARD_HEIGHT = 0.96;
const CARD_WIDTH = (CARD_HEIGHT * CARD_RATIO) / VIEW_RATIO;

export const CARD_RECT: Rect = {
  x: (1 - CARD_WIDTH) / 2,
  y: (1 - CARD_HEIGHT) / 2,
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
};

// The info line at the bottom left: collector number, rarity, set code and
// language on cards since Magic 2015. Its two rows sit in the thick bottom
// border, at about 94–99% of the card height; the zone starts a little above
// to allow for a card held slightly off. (It was at 90–97.5%, which caught the
// last line of rules text once the card filled the outline, 2026-11-21.)
export const COLLECTOR_ZONE: Rect = {
  x: 0.03,
  y: 0.925,
  width: 0.45,
  height: 0.065,
};

// The name at the top left, stopping before the mana cost on the right.
export const TITLE_ZONE: Rect = {
  x: 0.06,
  y: 0.035,
  width: 0.66,
  height: 0.065,
};

// What the scanner is doing. Until recognition exists (D-062) it stays
// "aiming".
export type GuideStatus =
  | "aiming"
  | "reading-collector"
  | "reading-title"
  | "found";

export const GUIDE_INSTRUCTIONS: Record<GuideStatus, string> = {
  aiming: "Hold the card close so it fills the frame. Set and number in the lower box.",
  "reading-collector": "Reading the set and number. Hold still.",
  "reading-title":
    "Can't read the set and number. Reading the card name in the top box.",
  found: "Card found.",
};
