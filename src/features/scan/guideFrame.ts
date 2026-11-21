// Geometry and texts of the scanner's guide (D-061, changed by D-065).
//
// The guide is one wide box in the middle of the camera view. The user fills
// it with the card's info line (set code and collector number, bottom left),
// held close, so the small text gets about twice the camera pixels it got
// when the whole card had to fit (D-065). The OCR (D-062) cuts its strip out
// of the video at exactly this box, so what is drawn and what is read agree.
//
// Positions are fractions (0 to 1) of the camera view box, so they work at
// any size.

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Aspect ratio of the camera view box (width / height). Wider than tall, so
// the camera takes less of the screen height; ScanCamera.css uses the same
// value. (It was 3:4 portrait while the whole card had to fit.)
export const VIEW_RATIO = 4 / 3;

// Shape of the box on screen (width / height). The info line is about
// 28 × 6 mm; 4:1 leaves room to aim without taking in much of the rules
// text above it.
export const GUIDE_BOX_RATIO = 4;

// The box spans 90% of the view width; its height follows from its shape:
// as a fraction of the view height it is width / GUIDE_BOX_RATIO × VIEW_RATIO.
// Centered in both directions.
const GUIDE_WIDTH = 0.9;
const GUIDE_HEIGHT = (GUIDE_WIDTH / GUIDE_BOX_RATIO) * VIEW_RATIO;

export const GUIDE_RECT: Rect = {
  x: (1 - GUIDE_WIDTH) / 2,
  y: (1 - GUIDE_HEIGHT) / 2,
  width: GUIDE_WIDTH,
  height: GUIDE_HEIGHT,
};

// Approximate width of the info line (collector number, set code and
// language) on cards since Magic 2015, for the debug panel's px/mm estimate.
export const INFO_LINE_WIDTH_MM = 28;

// What the scanner is doing. The "-title" states are the name fallback
// (D-065 step 2): the user puts the card name in the same box.
export type GuideStatus =
  | "aiming"
  | "aiming-title"
  | "reading-collector"
  | "reading-title"
  | "found";

export const GUIDE_INSTRUCTIONS: Record<GuideStatus, string> = {
  aiming: "Hold the card close: fill the box with the set and number (bottom left of the card).",
  "aiming-title": "Put the card name (top left of the card) in the box.",
  "reading-collector": "Reading the set and number. Hold still.",
  "reading-title": "Reading the card name. Hold still.",
  found: "Card found.",
};
