import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { getScanRects } from "./frameGeometry.ts";
import type { PixelRect } from "./frameGeometry.ts";

// Stage 1 of the recognition pipeline (D-062): notice when the card is held
// still, then cut the title and collector zones out of that one frame.
//
// Tuning values. The thresholds were raised from 6 / 14 to 20 / 30 after a
// hand-held test on a phone (2026-11-21): camera noise alone kept the change
// near 20. Retune with the debug panel (ScanDebug) on other phones.
const SAMPLE_INTERVAL_MS = 250; // about 4 samples a second
const SAMPLE_WIDTH = 45; // tiny copy of the card area, 63:88 card shape
const SAMPLE_HEIGHT = 63;
// Average change per pixel between two samples, on a 0–255 gray scale.
const STEADY_BELOW = 20; // under this, the picture counts as still
const MOVED_ABOVE = 30; // over this, the card has moved away
const STEADY_SAMPLES = 3; // still samples in a row before capturing (~0.75 s)

export type SteadyStatus = "moving" | "steady";

// The zones cut out of the steady frame, at full video resolution.
export type SteadyCapture = {
  title: HTMLCanvasElement;
  collector: HTMLCanvasElement;
  capturedAt: number;
};

function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    // Standard luma weights: green looks brightest to the eye.
    gray[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
  }
  return gray;
}

function meanDifference(a: Uint8Array, b: Uint8Array): number {
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    total += Math.abs(a[i] - b[i]);
  }
  return total / a.length;
}

function cropToCanvas(video: HTMLVideoElement, rect: PixelRect): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas
    .getContext("2d")
    ?.drawImage(video, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas;
}

// Watches the card area of `videoRef` while `enabled` is true.
// - `status` is "steady" from the moment a still frame was captured until the
//   card clearly moves again. Two thresholds (hysteresis) keep one card from
//   being captured over and over, or flickering between the two states.
// - `difference` is the latest change value, for the debug panel.
export default function useSteadyFrame(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
) {
  const [status, setStatus] = useState<SteadyStatus>("moving");
  const [difference, setDifference] = useState<number | null>(null);
  const [capture, setCapture] = useState<SteadyCapture | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) {
      return;
    }

    const sample = document.createElement("canvas");
    sample.width = SAMPLE_WIDTH;
    sample.height = SAMPLE_HEIGHT;
    // Tells the browser the pixels are read back often, so it keeps the
    // canvas in memory the CPU can read quickly.
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    let previous: Uint8Array | null = null;
    let stillCount = 0;
    let captured = false;

    const timer = window.setInterval(() => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
        return;
      }
      // Recomputed each time: the video size can change, e.g. on rotation.
      const rects = getScanRects(video.videoWidth, video.videoHeight);
      const { card } = rects;
      context.drawImage(video, card.x, card.y, card.width, card.height, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const gray = toGray(context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data);

      if (previous) {
        const change = meanDifference(gray, previous);
        setDifference(change);

        if (captured) {
          if (change > MOVED_ABOVE) {
            captured = false;
            stillCount = 0;
            setStatus("moving");
          }
        } else if (change < STEADY_BELOW) {
          stillCount += 1;
          if (stillCount >= STEADY_SAMPLES) {
            captured = true;
            setCapture({
              title: cropToCanvas(video, rects.title),
              collector: cropToCanvas(video, rects.collector),
              capturedAt: Date.now(),
            });
            setStatus("steady");
          }
        } else {
          stillCount = 0;
        }
      }
      previous = gray;
    }, SAMPLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [videoRef, enabled]);

  return { status, difference, capture };
}
