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

// A Magic card is 63 × 88 mm. The outline is 88% of the view height and
// centered, which leaves the same margin on all four sides of a 3:4 box.
export const CARD_RATIO = 63 / 88;

export const CARD_RECT: Rect = {
  x: 0.08,
  y: 0.06,
  width: 0.84,
  height: 0.88,
};

// The info line at the bottom left: collector number, rarity, set code and
// language on cards since Magic 2015.
export const COLLECTOR_ZONE: Rect = {
  x: 0.04,
  y: 0.9,
  width: 0.42,
  height: 0.075,
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
  aiming: "Fit the card in the frame. Set and number in the lower box.",
  "reading-collector": "Reading the set and number. Hold still.",
  "reading-title":
    "Can't read the set and number. Reading the card name in the top box.",
  found: "Card found.",
};
