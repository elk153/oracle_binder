// Pure image filters on gray pixel arrays (one value 0–255 per pixel, row by
// row), for cleaning up a text strip before OCR. Compared in the scan
// benchmark (D-062 follow-up); unit tested without a browser.

// Light text on a dark background (the info line of black-bordered cards)
// is turned into dark text on light, which Tesseract reads best. The
// background is the majority, so a dark average means a dark background.
export function invertIfDarkBackground(gray: Uint8Array): Uint8Array {
  let sum = 0;
  for (const value of gray) {
    sum += value;
  }
  if (gray.length === 0 || sum / gray.length >= 128) {
    return gray;
  }
  return gray.map((value) => 255 - value);
}

// Spreads the gray levels between the `low` and `high` percentiles over the
// full 0–255 range, so faint text on a gray background gets full contrast.
// The percentiles ignore a few extreme pixels (specks, glare).
export function contrastStretch(gray: Uint8Array, low = 0.02, high = 0.98): Uint8Array {
  if (gray.length === 0) {
    return gray;
  }
  const histogram = new Array<number>(256).fill(0);
  for (const value of gray) {
    histogram[value] += 1;
  }
  const lowCount = gray.length * low;
  const highCount = gray.length * high;
  let seen = 0;
  let lowValue = 0;
  let highValue = 255;
  let foundLow = false;
  for (let g = 0; g < 256; g += 1) {
    seen += histogram[g];
    if (!foundLow && seen > lowCount) {
      lowValue = g;
      foundLow = true;
    }
    if (seen >= highCount) {
      highValue = g;
      break;
    }
  }
  if (highValue <= lowValue) {
    return gray;
  }
  const scale = 255 / (highValue - lowValue);
  return gray.map((value) => Math.min(255, Math.max(0, Math.round((value - lowValue) * scale))));
}

// Sauvola's local threshold: each pixel is compared with the mean and spread
// of the gray levels in a square window around it, so uneven light and glare
// across the strip do not break the text the way one global cutoff does.
// Expects dark text on a light background; returns 0 (text) or 255.
// `window` is the window size in pixels; `k` how far below the local mean
// a pixel must be to count as text (0.2–0.5 is usual).
export function sauvolaBinarize(
  gray: Uint8Array,
  width: number,
  height: number,
  window: number,
  k = 0.2,
): Uint8Array {
  // Integral images: the sum (and sum of squares) of any rectangle in four
  // lookups, so each window costs the same whatever its size.
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  const squares = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    let rowSquares = 0;
    for (let x = 0; x < width; x += 1) {
      const value = gray[y * width + x];
      rowSum += value;
      rowSquares += value * value;
      const i = (y + 1) * stride + (x + 1);
      sums[i] = sums[i - stride] + rowSum;
      squares[i] = squares[i - stride] + rowSquares;
    }
  }

  const half = Math.max(1, Math.floor(window / 2));
  const output = new Uint8Array(gray.length);
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - half);
    const bottom = Math.min(height, y + half + 1);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - half);
      const right = Math.min(width, x + half + 1);
      const count = (bottom - top) * (right - left);
      const a = top * stride + left;
      const b = top * stride + right;
      const c = bottom * stride + left;
      const d = bottom * stride + right;
      const mean = (sums[d] - sums[b] - sums[c] + sums[a]) / count;
      const variance = (squares[d] - squares[b] - squares[c] + squares[a]) / count - mean * mean;
      const deviation = Math.sqrt(Math.max(0, variance));
      const threshold = mean * (1 + k * (deviation / 128 - 1));
      output[y * width + x] = gray[y * width + x] < threshold ? 0 : 255;
    }
  }
  return output;
}

// Where to cut a two-line strip: the row with the least text (black pixels)
// in the middle part of the strip (30–70% of its height).
export function splitRow(binary: Uint8Array, width: number, height: number): number {
  const from = Math.floor(height * 0.3);
  const to = Math.max(from + 1, Math.ceil(height * 0.7));
  let bestRow = Math.floor(height / 2);
  let bestInk = Number.POSITIVE_INFINITY;
  for (let y = from; y < to && y < height; y += 1) {
    let ink = 0;
    for (let x = 0; x < width; x += 1) {
      if (binary[y * width + x] === 0) {
        ink += 1;
      }
    }
    if (ink < bestInk) {
      bestInk = ink;
      bestRow = y;
    }
  }
  return bestRow;
}
