import { GUIDE_RECT, VIEW_RATIO } from "./guideFrame.ts";
import type { Rect } from "./guideFrame.ts";

// A rectangle in whole video pixels.
export type PixelRect = Rect;

// The part of the video the user actually sees. The video fills a box of
// `viewRatio` (width / height) with `object-fit: cover`, which scales it up
// until the box is full and cuts off what sticks out, equally on both sides.
export function coverCrop(
  videoWidth: number,
  videoHeight: number,
  viewRatio: number,
): PixelRect {
  const videoRatio = videoWidth / videoHeight;
  if (videoRatio > viewRatio) {
    // The video is wider than the box: the left and right are cut off.
    const width = videoHeight * viewRatio;
    return { x: (videoWidth - width) / 2, y: 0, width, height: videoHeight };
  }
  // The video is taller than the box: the top and bottom are cut off.
  const height = videoWidth / viewRatio;
  return { x: 0, y: (videoHeight - height) / 2, width: videoWidth, height };
}

// Places `rect` (fractions of `outer`) inside `outer`. Works for fractions in
// fractions and for fractions in pixels.
export function placeIn(rect: Rect, outer: Rect): Rect {
  return {
    x: outer.x + rect.x * outer.width,
    y: outer.y + rect.y * outer.height,
    width: rect.width * outer.width,
    height: rect.height * outer.height,
  };
}

function roundRect(rect: Rect): PixelRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

// Where the guide box (guideFrame.ts) falls in the video's own pixels, for a
// video of the given size.
export function getGuideRect(videoWidth: number, videoHeight: number): PixelRect {
  const visible = coverCrop(videoWidth, videoHeight, VIEW_RATIO);
  return roundRect(placeIn(GUIDE_RECT, visible));
}
