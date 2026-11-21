import type { CameraInfo } from "./cameraInfo.ts";
import type { CollectorLine } from "./parseCollectorLine.ts";

// One saved scan for the OCR reliability study (D-062 follow-up): the raw
// strips exactly as cut from the camera frame, what the card really says,
// and the conditions. Saved from the development-only debug panel as one
// JSON file; the benchmark (phase 1) reads these files.

export type StripImage = {
  width: number;
  height: number;
  dataUrl: string; // PNG
};

export type ScanSample = {
  format: "oracle-binder-scan-sample";
  version: 1;
  savedAt: string; // ISO date
  truth: CollectorLine | null; // what the card really says, typed by the tester
  note: string; // free text, e.g. "low light, foil"
  camera: CameraInfo | null;
  videoWidth: number;
  videoHeight: number;
  pixelsPerMm: number;
  sharpness: number; // Laplacian variance of the raw collector strip, scaled to 48 px height
  // Which guide took the sample: "card" (whole card in a 3:4 view, D-061;
  // older files have no field) or "code" (info line in the box, D-065).
  guide?: "card" | "code";
  collector: StripImage; // the strip the OCR reads (the box, for "code")
  title?: StripImage; // the title zone; "card" samples only
  ocr: {
    text: string;
    confidence: number;
    readMs: number;
    parsed: CollectorLine | null;
  } | null;
};

// "ltc 277" or "LTC/277" → { setCode: "ltc", collectorNumber: "277" }.
export function parseTruth(value: string): CollectorLine | null {
  const match = /^\s*([a-z0-9]{2,6})[\s/#-]+0*([0-9]+[a-z]?)\s*$/i.exec(value);
  return match ? { setCode: match[1].toLowerCase(), collectorNumber: match[2] } : null;
}

export function sampleFileName(sample: ScanSample): string {
  const label = sample.truth
    ? `${sample.truth.setCode}-${sample.truth.collectorNumber}`
    : "unknown";
  const time = sample.savedAt.replace(/[:.]/g, "-");
  return `scan-sample-${label}-${time}.json`;
}

// Offers the sample as a file download (on iPhone: saved to Files).
export function downloadSample(sample: ScanSample): void {
  const blob = new Blob([JSON.stringify(sample)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sampleFileName(sample);
  link.click();
  // Give the browser a moment to start the download before freeing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
