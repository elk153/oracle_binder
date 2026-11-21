// Small pure image helpers for the scanner. They work on plain arrays, so
// they are unit tested without a browser.

// RGBA pixels (as from canvas getImageData) to one gray value per pixel,
// with the standard luma weights: green looks brightest to the eye.
export function toGray(rgba: ArrayLike<number>): Uint8Array {
  const gray = new Uint8Array(Math.floor(rgba.length / 4));
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    gray[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
  }
  return gray;
}

// Sharpness as the variance of the Laplacian: each pixel compared with its
// four neighbours. Sharp edges give large values, blur (out of focus or
// moving) gives small ones. Only meaningful to compare images of similar
// content and size, e.g. strips of the same zone.
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  if (width < 3 || height < 3) {
    return 0;
  }
  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const laplacian =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += laplacian;
      sumOfSquares += laplacian * laplacian;
      count += 1;
    }
  }
  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}
