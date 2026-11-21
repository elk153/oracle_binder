import { laplacianVariance, toGray } from "./imageMath.ts";

// How sharp a cut-out strip is (D-062 follow-up, D-065 step 3): used by the
// capture to keep the sharpest of the still frames, and shown and saved by
// the debug panel.

// The strip is measured at this height, whatever the camera resolution:
// the Laplacian compares neighbouring pixels, so the same edge spread over
// more pixels (4K) would otherwise score lower although it looks sharper.
export const SHARPNESS_HEIGHT = 48;

// Laplacian variance of the strip scaled to SHARPNESS_HEIGHT. Higher is
// sharper; only comparable between strips of the same kind of content.
export function stripSharpness(source: HTMLCanvasElement): number {
  if (source.width === 0 || source.height === 0) {
    return 0;
  }
  const height = SHARPNESS_HEIGHT;
  const width = Math.max(3, Math.round((source.width * height) / source.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return 0;
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return laplacianVariance(toGray(data), width, height);
}
