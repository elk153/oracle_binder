import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { getGuideRect } from "./frameGeometry.ts";
import { INFO_LINE_WIDTH_MM } from "./guideFrame.ts";
import type { PixelRect } from "./frameGeometry.ts";
import { toGray } from "./imageMath.ts";

// Stage 1 of the recognition pipeline (D-062): notice when the card is held
// still in the guide box, then cut the box out of that one frame (D-065).
//
// Tuning values. The thresholds were raised from 6 / 14 to 20 / 30 after a
// hand-held test on a phone (2026-11-21): camera noise alone kept the change
// near 20. Retune with the debug panel (ScanDebug) on other phones.
const SAMPLE_INTERVAL_MS = 250; // about 4 samples a second
const SAMPLE_WIDTH = 96; // tiny copy of the guide box, 4:1 like the box
const SAMPLE_HEIGHT = 24;
// Average change per pixel between two samples, on a 0–255 gray scale.
const STEADY_BELOW = 20; // under this, the picture counts as still
const MOVED_ABOVE = 30; // over this, the card has moved away
const STEADY_SAMPLES = 3; // still samples in a row before capturing (~0.75 s)

export type SteadyStatus = "moving" | "steady";

// The guide box cut out of the steady frame, at full video resolution.
export type SteadyCapture = {
  collector: HTMLCanvasElement;
  capturedAt: number;
  videoWidth: number;
  videoHeight: number;
  // Estimated video pixels per millimetre of card, if the info line spans
  // the box's width as asked (INFO_LINE_WIDTH_MM).
  pixelsPerMm: number;
};

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

// Watches the guide box of `videoRef` while `enabled` is true.
// - `status` is "steady" from the moment a still frame was captured until the
//   card clearly moves again. Two thresholds (hysteresis) keep one card from
//   being captured over and over, or flickering between the two states.
// - `difference` is the latest change value, for the debug panel.
// - With `holdCaptures` (the scanner's Test mode), a capture is kept and no
//   new one is taken, even when the card moves, until `reset()` is called.
export default function useSteadyFrame(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  { holdCaptures = false }: { holdCaptures?: boolean } = {},
) {
  const [status, setStatus] = useState<SteadyStatus>("moving");
  const [difference, setDifference] = useState<number | null>(null);
  const [capture, setCapture] = useState<SteadyCapture | null>(null);
  // Changing this number restarts the watching effect with a clean slate.
  const [resetCount, setResetCount] = useState(0);

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
      const box = getGuideRect(video.videoWidth, video.videoHeight);
      context.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const gray = toGray(context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data);

      if (previous) {
        const change = meanDifference(gray, previous);
        setDifference(change);

        if (captured) {
          if (!holdCaptures && change > MOVED_ABOVE) {
            captured = false;
            stillCount = 0;
            setStatus("moving");
          }
        } else if (change < STEADY_BELOW) {
          stillCount += 1;
          if (stillCount >= STEADY_SAMPLES) {
            captured = true;
            setCapture({
              collector: cropToCanvas(video, box),
              capturedAt: Date.now(),
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              pixelsPerMm: box.width / INFO_LINE_WIDTH_MM,
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
  }, [videoRef, enabled, holdCaptures, resetCount]);

  // Drops the current capture and starts watching for a new still card.
  function reset() {
    setCapture(null);
    setStatus("moving");
    setResetCount((count) => count + 1);
  }

  return { status, difference, capture, reset };
}
