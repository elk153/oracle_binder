import type Tesseract from "tesseract.js";

// The one place that talks to the OCR library (D-062, tesseract.js 7). The
// rest of the scanner only uses TextReader, so the library can be swapped
// without touching the camera or recognition code.
//
// tesseract.js is loaded with a dynamic import(), so it is downloaded only
// when the scanner needs it, not with the main bundle. On first use it fetches
// its WebAssembly engine and the English data from the jsDelivr CDN (the
// library's default) and keeps the data in IndexedDB for later visits.

export type TextLayout =
  | "line" // exactly one line of text, e.g. a card title
  | "block"; // a few lines, e.g. the two-line collector info

export type ReadTextOptions = {
  // Only these characters can come out; everything else is never guessed.
  characters: string;
  layout: TextLayout;
};

export type TextReading = {
  text: string;
  confidence: number; // 0–100, Tesseract's own estimate
  durationMs: number; // time spent reading this image
};

export type TextReader = {
  readText: (image: HTMLCanvasElement, options: ReadTextOptions) => Promise<TextReading>;
  terminate: () => Promise<void>;
};

// Starts one OCR worker (a background thread) with English data. Reuse it for
// every image, and terminate it when the scanner closes.
export async function createTextReader(): Promise<TextReader> {
  const { default: tesseract } = await import("tesseract.js");
  const worker = await tesseract.createWorker("eng");

  const toPageSegMode: Record<TextLayout, Tesseract.PSM> = {
    line: tesseract.PSM.SINGLE_LINE,
    block: tesseract.PSM.SINGLE_BLOCK,
  };
  // Parameters stick to the worker, so they are only sent when they change.
  let current: ReadTextOptions | null = null;

  return {
    async readText(image, options) {
      if (current?.characters !== options.characters || current.layout !== options.layout) {
        await worker.setParameters({
          tessedit_char_whitelist: options.characters,
          tessedit_pageseg_mode: toPageSegMode[options.layout],
        });
        current = options;
      }
      const started = performance.now();
      const { data } = await worker.recognize(image);
      return {
        text: data.text,
        confidence: data.confidence,
        durationMs: performance.now() - started,
      };
    },
    async terminate() {
      await worker.terminate();
    },
  };
}
