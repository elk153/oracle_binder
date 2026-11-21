// D-062: the automatic black/white cutoff used to clean up text strips.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import { otsuThreshold } from "../../src/features/scan/prepareStrip.ts";

function histogramOf(groups: Array<[gray: number, count: number]>): number[] {
  const histogram = new Array<number>(256).fill(0);
  for (const [gray, count] of groups) {
    histogram[gray] += count;
  }
  return histogram;
}

test("splits two clear groups between them", () => {
  // Dark text around 30, light background around 220.
  const threshold = otsuThreshold(histogramOf([[25, 50], [30, 100], [35, 50], [215, 400], [220, 800], [225, 400]]));
  assert.ok(threshold > 35 && threshold <= 215, `threshold ${threshold}`);
});

test("works when the dark group is the larger one (white text on black)", () => {
  const threshold = otsuThreshold(histogramOf([[10, 900], [15, 900], [200, 100], [210, 100]]));
  assert.ok(threshold > 15 && threshold <= 200, `threshold ${threshold}`);
});
