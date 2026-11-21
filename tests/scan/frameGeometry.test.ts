// D-062 / D-065: the scanner reads exactly the area the guide box shows.
// These tests check the mapping from the on-screen frame to video pixels.
//
// Run from the repository root (Node 22, no dependency):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coverCrop,
  getGuideRect,
  placeIn,
} from "../../src/features/scan/frameGeometry.ts";
import { GUIDE_BOX_RATIO, VIEW_RATIO } from "../../src/features/scan/guideFrame.ts";

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

test("the guide box keeps its 4:1 shape in video pixels", () => {
  for (const [w, h] of [[2160, 3840], [3840, 2160], [1080, 1920], [1280, 720]]) {
    const box = getGuideRect(w, h);
    assert.ok(Math.abs(box.width / box.height - GUIDE_BOX_RATIO) < 0.02, `${w}×${h}`);
  }
});

test("the guide box is centered inside the visible part of the video", () => {
  for (const [w, h] of [[2160, 3840], [3840, 2160], [1080, 1920]]) {
    const visible = coverCrop(w, h, VIEW_RATIO);
    const box = getGuideRect(w, h);
    assert.ok(box.x >= visible.x && box.y >= visible.y, `${w}×${h} starts inside`);
    assert.ok(box.x + box.width <= visible.x + visible.width, `${w}×${h} ends inside (x)`);
    assert.ok(box.y + box.height <= visible.y + visible.height, `${w}×${h} ends inside (y)`);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    assert.ok(Math.abs(centerX - w / 2) <= 1, `${w}×${h} centered (x)`);
    assert.ok(Math.abs(centerY - h / 2) <= 1, `${w}×${h} centered (y)`);
  }
});

test("a portrait 4K video gives the box most of its 2160 px width", () => {
  // The 4:3 view shows the full 2160 px width; the box takes 90% of it.
  assert.equal(getGuideRect(2160, 3840).width, 1944);
});
