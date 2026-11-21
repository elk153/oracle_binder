// D-061 / D-062: the scanner reads exactly the areas the guide frame shows.
// These tests check the mapping from the on-screen frame to video pixels.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverCrop,
  getScanRects,
  placeIn,
} from "../../src/features/scan/frameGeometry.ts";
import { CARD_RATIO, VIEW_RATIO } from "../../src/features/scan/guideFrame.ts";

test("coverCrop cuts the sides of a landscape video for a portrait box", () => {
  // 1920×1080 into 3:4: visible width is 1080 × 3/4 = 810, centered.
  assert.deepEqual(coverCrop(1920, 1080, 3 / 4), {
    x: 555,
    y: 0,
    width: 810,
    height: 1080,
  });
});

test("coverCrop cuts the top and bottom of a tall portrait video", () => {
  // 1080×1920 into 3:4: visible height is 1080 / (3/4) = 1440, centered.
  assert.deepEqual(coverCrop(1080, 1920, 3 / 4), {
    x: 0,
    y: 240,
    width: 1080,
    height: 1440,
  });
});

test("coverCrop keeps the whole video when the ratios match", () => {
  assert.deepEqual(coverCrop(900, 1200, 3 / 4), {
    x: 0,
    y: 0,
    width: 900,
    height: 1200,
  });
});

test("placeIn scales and offsets a fractional rectangle", () => {
  assert.deepEqual(
    placeIn({ x: 0.5, y: 0.25, width: 0.5, height: 0.5 }, { x: 10, y: 20, width: 100, height: 200 }),
    { x: 60, y: 70, width: 50, height: 100 },
  );
});

test("the card outline keeps the 63 × 88 card shape on screen", () => {
  // CARD_RECT is in fractions of a 3:4 box, so convert to a real shape first.
  const { card } = getScanRects(900, 1200);
  assert.ok(Math.abs(card.width / card.height - CARD_RATIO) < 0.01);
  assert.equal(VIEW_RATIO, 3 / 4);
});

test("both zones lie inside the card, title above collector", () => {
  for (const [w, h] of [[1920, 1080], [1080, 1920], [1280, 720]]) {
    const { card, title, collector } = getScanRects(w, h);
    for (const zone of [title, collector]) {
      assert.ok(zone.x >= card.x && zone.y >= card.y, `${w}×${h} zone starts inside`);
      assert.ok(zone.x + zone.width <= card.x + card.width, `${w}×${h} zone ends inside (x)`);
      assert.ok(zone.y + zone.height <= card.y + card.height, `${w}×${h} zone ends inside (y)`);
    }
    assert.ok(title.y + title.height < collector.y, `${w}×${h} title above collector`);
  }
});
