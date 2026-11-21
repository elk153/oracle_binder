import { splitRow } from "./stripFilters.ts";

// Cleans up a cut-out text strip before OCR (D-062): Tesseract reads best
// from large, black text on a white background with some margin around it.

// Two text lines plus margin. Tesseract works best with letters about 30 px
// tall, so the strip is enlarged to at least this height (never shrunk).
const TARGET_HEIGHT = 120;
const MAX_SCALE = 4;
const PADDING = 12; // white margin around the text, in output pixels

// Otsu's method: picks the gray level that best splits the pixels into two
// groups (text and background), by maximizing the variance between the
// groups. `histogram[g]` is the number of pixels with gray level g (0–255).
// Returns the threshold: pixels at or above it belong to the light group.
export function otsuThreshold(histogram: ArrayLike<number>): number {
  let total = 0;
  let sumAll = 0;
  for (let g = 0; g < 256; g += 1) {
    total += histogram[g];
    sumAll += g * histogram[g];
  }

  let darkCount = 0;
  let darkSum = 0;
  let bestThreshold = 128;
  let bestVariance = -1;
  for (let g = 0; g < 256; g += 1) {
    darkCount += histogram[g];
    const lightCount = total - darkCount;
    if (darkCount === 0 || lightCount === 0) {
      continue;
    }
    darkSum += g * histogram[g];
    const darkMean = darkSum / darkCount;
    const lightMean = (sumAll - darkSum) / lightCount;
    const variance = darkCount * lightCount * (darkMean - lightMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = g + 1;
    }
  }
  return bestThreshold;
}

// Enlarges the strip, turns it into pure black and white, and makes sure the
// text is the dark part: the info line of a black-bordered card is white text
// on black, so most pixels being dark means the picture must be inverted.
export function prepareStrip(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = Math.min(MAX_SCALE, Math.max(1, TARGET_HEIGHT / source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const scaled = document.createElement("canvas");
  scaled.width = width;
  scaled.height = height;
  const scaledContext = scaled.getContext("2d", { willReadFrequently: true });
  if (!scaledContext) {
    return source;
  }
  scaledContext.imageSmoothingQuality = "high";
  scaledContext.drawImage(source, 0, 0, width, height);
  const image = scaledContext.getImageData(0, 0, width, height);
  const pixels = image.data;

  const gray = new Uint8Array(width * height);
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    const value = Math.round((pixels[p] * 299 + pixels[p + 1] * 587 + pixels[p + 2] * 114) / 1000);
    gray[i] = value;
    histogram[value] += 1;
  }

  const threshold = otsuThreshold(histogram);
  let darkPixels = 0;
  for (let g = 0; g < threshold; g += 1) {
    darkPixels += histogram[g];
  }
  const invert = darkPixels > gray.length / 2;

  for (let i = 0; i < gray.length; i += 1) {
    const isLight = gray[i] >= threshold;
    const value = isLight !== invert ? 255 : 0;
    const p = i * 4;
    pixels[p] = value;
    pixels[p + 1] = value;
    pixels[p + 2] = value;
    pixels[p + 3] = 255;
  }

  const output = document.createElement("canvas");
  output.width = width + PADDING * 2;
  output.height = height + PADDING * 2;
  const outputContext = output.getContext("2d");
  if (!outputContext) {
    return source;
  }
  outputContext.fillStyle = "white";
  outputContext.fillRect(0, 0, output.width, output.height);
  outputContext.putImageData(image, PADDING, PADDING);
  return output;
}

// Cuts a prepared (black and white) two-row strip at its emptiest middle row
// (splitRow), so each row can be read on its own with the characters it can
// contain: the number row and the set row of the info line. Each part keeps
// the white margin on its outer side; the cut itself runs through white.
export function splitStripRows(prepared: HTMLCanvasElement): [HTMLCanvasElement, HTMLCanvasElement] {
  const { width, height } = prepared;
  const context = prepared.getContext("2d", { willReadFrequently: true });
  if (!context || height < 4) {
    return [prepared, prepared];
  }
  const { data } = context.getImageData(0, 0, width, height);
  // Black and white already: the red channel is the gray value.
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < binary.length; i += 1) {
    binary[i] = data[i * 4];
  }
  const cut = splitRow(binary, width, height);
  return [rowsOf(prepared, 0, cut), rowsOf(prepared, cut, height)];
}

function rowsOf(source: HTMLCanvasElement, from: number, to: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = Math.max(1, to - from);
  canvas.getContext("2d")?.drawImage(source, 0, from, source.width, to - from, 0, 0, source.width, to - from);
  return canvas;
}
