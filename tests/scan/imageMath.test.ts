// Scanner image helpers: gray conversion and the sharpness measure used to
// study OCR reliability (D-062 follow-up).
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import { laplacianVariance, toGray } from "../../src/features/scan/imageMath.ts";

test("toGray: white, black and pure green", () => {
  const gray = toGray([255, 255, 255, 255, 0, 0, 0, 255, 0, 255, 0, 255]);
  assert.deepEqual([...gray], [255, 0, 149]);
});

function image(width: number, height: number, pixel: (x: number, y: number) => number): number[] {
  const values: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values.push(pixel(x, y));
    }
  }
  return values;
}

test("a flat image has no sharpness", () => {
  assert.equal(laplacianVariance(image(10, 10, () => 128), 10, 10), 0);
});

test("hard edges are sharper than the same edges blurred", () => {
  const sharp = image(20, 20, (x) => (Math.floor(x / 2) % 2 === 0 ? 0 : 255));
  // The same stripes with soft ramps instead of jumps.
  const blurred = image(20, 20, (x) => 128 + 127 * Math.sin((Math.PI * x) / 2));
  assert.ok(laplacianVariance(sharp, 20, 20) > laplacianVariance(blurred, 20, 20));
});

test("images smaller than 3 × 3 give 0", () => {
  assert.equal(laplacianVariance([1, 2, 3, 4], 2, 2), 0);
});
