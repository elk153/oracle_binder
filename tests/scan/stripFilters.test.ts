// Strip filters compared in the scan benchmark (D-062 follow-up).
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contrastStretch,
  invertIfDarkBackground,
  sauvolaBinarize,
  splitRow,
} from "../../src/features/scan/stripFilters.ts";

test("a dark background is inverted, a light one is kept", () => {
  assert.deepEqual([...invertIfDarkBackground(Uint8Array.from([10, 10, 10, 240]))], [245, 245, 245, 15]);
  const light = Uint8Array.from([240, 240, 240, 10]);
  assert.equal(invertIfDarkBackground(light), light);
});

test("contrast stretch spreads a narrow gray range to 0–255", () => {
  // Half the pixels at 100, half at 140: low contrast.
  const gray = Uint8Array.from([...new Array(50).fill(100), ...new Array(50).fill(140)]);
  const stretched = contrastStretch(gray);
  assert.equal(stretched[0], 0);
  assert.equal(stretched[99], 255);
});

test("contrast stretch leaves a flat image alone", () => {
  const flat = Uint8Array.from(new Array(10).fill(90));
  assert.equal(contrastStretch(flat), flat);
});

// A 40 × 20 strip: background brightening from 120 (left) to 230 (right),
// with dark vertical bars ("text") at half the background's brightness.
// Light multiplies: ink reflects the same share of the light everywhere, so
// text in a brighter area is brighter too, in proportion.
function unevenStrip(): { gray: Uint8Array; width: number; height: number } {
  const width = 40;
  const height = 20;
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const background = 120 + Math.round((110 * x) / (width - 1));
      const isText = x % 10 >= 4 && x % 10 <= 5 && y >= 5 && y < 15;
      gray[y * width + x] = isText ? Math.round(background / 2) : background;
    }
  }
  return { gray, width, height };
}

test("Sauvola finds text on both the dark and the bright side", () => {
  const { gray, width, height } = unevenStrip();
  const binary = sauvolaBinarize(gray, width, height, 9);
  // Text bars at x = 4–5 (dark side) and x = 34–35 (bright side), row 10.
  assert.equal(binary[10 * width + 4], 0);
  assert.equal(binary[10 * width + 34], 0);
  // Background between bars, and rows without text, stay white.
  assert.equal(binary[10 * width + 8], 255);
  assert.equal(binary[2 * width + 34], 255);
});

test("splitRow picks the empty row between two text lines", () => {
  const width = 10;
  const height = 20;
  const binary = new Uint8Array(width * height).fill(255);
  for (let y = 0; y < height; y += 1) {
    // Text rows 3–8 and 12–17; row 10 is empty.
    const isText = (y >= 3 && y <= 8) || (y >= 12 && y <= 17);
    if (isText) {
      for (let x = 2; x < 8; x += 1) {
        binary[y * width + x] = 0;
      }
    }
  }
  const row = splitRow(binary, width, height);
  assert.ok(row >= 9 && row <= 11, `row ${row}`);
});
